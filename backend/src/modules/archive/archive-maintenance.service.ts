import { Injectable, Logger } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionsService } from 'src/modules/predictions/predictions.service';

const ARCHIVE_PROVIDER_CODE = 'club_football_archive';
const DEFAULT_PREDICTION_CHUNK_SIZE = 25;

export interface RefreshFootballArchiveOptions {
  from?: string;
  to?: string;
  leagueId?: string;
  seasonId?: string;
  limit?: number;
  chunkSize?: number;
  skipStandings?: boolean;
  skipForms?: boolean;
  skipPredictions?: boolean;
  onlyArchiveMatches?: boolean;
  onlyMissingPredictions?: boolean;
}

interface StandingAccumulator {
  teamId: string;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  recent: Array<'W' | 'D' | 'L'>;
}

interface FormAccumulator {
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  sampleSize: number;
  recent: Array<'W' | 'D' | 'L'>;
  leagueId: string | null;
}

@Injectable()
export class ArchiveMaintenanceService {
  private readonly logger = new Logger(ArchiveMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionsService: PredictionsService,
    private readonly cacheService: CacheService,
  ) {}

  async refreshFootballArchive(options: RefreshFootballArchiveOptions = {}) {
    const result: Record<string, unknown> = {
      startedAt: new Date().toISOString(),
      options: {
        onlyArchiveMatches: options.onlyArchiveMatches !== false,
        onlyMissingPredictions: options.onlyMissingPredictions !== false,
        ...options,
      },
    };

    if (!options.skipStandings) {
      result.standings = await this.rebuildStandingsSnapshots(options);
    }

    if (!options.skipForms) {
      result.forms = await this.rebuildLatestTeamFormSnapshots(options);
    }

    if (!options.skipPredictions) {
      result.predictions = await this.backfillHistoricalPredictions(options);
    }

    await this.invalidateFootballCaches();
    result.finishedAt = new Date().toISOString();
    return result;
  }

  async rebuildStandingsSnapshots(options: RefreshFootballArchiveOptions = {}) {
    const rows = await this.prisma.match.findMany({
      where: this.buildHistoricalMatchWhere(options),
      select: {
        leagueId: true,
        seasonId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        matchDate: true,
      },
      orderBy: [{ leagueId: 'asc' }, { seasonId: 'asc' }, { matchDate: 'asc' }],
      ...(options.limit ? { take: options.limit } : {}),
    });

    const seasonBuckets = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.seasonId) {
        continue;
      }
      const key = `${row.leagueId}:${row.seasonId}`;
      const bucket = seasonBuckets.get(key) ?? [];
      bucket.push(row);
      seasonBuckets.set(key, bucket);
    }

    const snapshots: Prisma.StandingsSnapshotCreateManyInput[] = [];
    const seasonPairs: Array<{ leagueId: string; seasonId: string }> = [];
    for (const [key, matches] of seasonBuckets.entries()) {
      const [leagueId, seasonId] = key.split(':');
      seasonPairs.push({ leagueId, seasonId });
      snapshots.push(...this.computeStandingsRows(leagueId, seasonId, matches));
    }

    if (seasonPairs.length) {
      await this.prisma.$transaction(async (tx) => {
        for (const pair of seasonPairs) {
          await tx.standingsSnapshot.deleteMany({
            where: { leagueId: pair.leagueId, seasonId: pair.seasonId },
          });
        }

        if (snapshots.length) {
          await tx.standingsSnapshot.createMany({
            data: snapshots,
            skipDuplicates: true,
          });
        }
      });
    }

    this.logger.log(`Football standings rebuilt seasons=${seasonPairs.length} rows=${snapshots.length}`);
    return {
      seasonsRebuilt: seasonPairs.length,
      standingsRowsWritten: snapshots.length,
      scannedMatches: rows.length,
    };
  }

  async rebuildLatestTeamFormSnapshots(options: RefreshFootballArchiveOptions = {}) {
    const matches = await this.prisma.match.findMany({
      where: this.buildHistoricalMatchWhere(options),
      select: {
        leagueId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        matchDate: true,
      },
      orderBy: { matchDate: 'desc' },
      ...(options.limit ? { take: options.limit } : {}),
    });

    const formByTeam = new Map<string, FormAccumulator>();
    for (const match of matches) {
      this.accumulateRecentForm(formByTeam, match.homeTeamId, match.leagueId, Number(match.homeScore ?? 0), Number(match.awayScore ?? 0));
      this.accumulateRecentForm(formByTeam, match.awayTeamId, match.leagueId, Number(match.awayScore ?? 0), Number(match.homeScore ?? 0));
    }

    const snapshots = Array.from(formByTeam.entries()).map(([teamId, value]) => ({
      teamId,
      leagueId: value.leagueId,
      wins: value.wins,
      draws: value.draws,
      losses: value.losses,
      scored: value.scored,
      conceded: value.conceded,
      formString: value.recent.join(''),
      sampleSize: value.sampleSize,
    }));

    if (snapshots.length) {
      await this.prisma.teamFormSnapshot.createMany({
        data: snapshots,
        skipDuplicates: false,
      });
    }

    this.logger.log(`Football team forms rebuilt teams=${snapshots.length}`);
    return {
      teamsUpdated: snapshots.length,
      scannedMatches: matches.length,
    };
  }

  async backfillHistoricalPredictions(options: RefreshFootballArchiveOptions = {}) {
    const chunkSize = Math.max(1, Math.min(200, options.chunkSize ?? DEFAULT_PREDICTION_CHUNK_SIZE));
    const matches = await this.prisma.match.findMany({
      where: {
        ...this.buildHistoricalMatchWhere(options),
        ...(options.onlyMissingPredictions !== false ? { predictions: { none: { status: 'PUBLISHED' } } } : {}),
      },
      select: { id: true, matchDate: true },
      orderBy: { matchDate: 'asc' },
      ...(options.limit ? { take: options.limit } : {}),
    });

    let succeeded = 0;
    let failed = 0;

    for (let index = 0; index < matches.length; index += chunkSize) {
      const ids = matches.slice(index, index + chunkSize).map((item) => item.id);
      const featureResults = await this.predictionsService.generateFeaturesForMatches(ids);
      const successfulIds = featureResults
        .filter((item) => item.status === 'success')
        .map((item) => item.matchId);

      const predictionResults = await this.predictionsService.generateForMatches(successfulIds);
      succeeded += predictionResults.filter((item) => item.status === 'success').length;
      failed += predictionResults.filter((item) => item.status === 'failed').length;

      if ((index / chunkSize + 1) % 10 === 0 || index + chunkSize >= matches.length) {
        this.logger.log(
          `Historical prediction backfill progress processed=${Math.min(index + chunkSize, matches.length)}/${matches.length} success=${succeeded} failed=${failed}`,
        );
      }
    }

    return {
      queuedMatches: matches.length,
      successfulPredictions: succeeded,
      failedPredictions: failed,
      chunkSize,
    };
  }

  private buildHistoricalMatchWhere(options: RefreshFootballArchiveOptions): Prisma.MatchWhereInput {
    const now = new Date();
    return {
      deletedAt: null,
      status: MatchStatus.COMPLETED,
      sport: { code: 'FOOTBALL' },
      matchDate: {
        ...(options.from ? { gte: new Date(options.from) } : {}),
        ...(options.to ? { lte: new Date(options.to) } : { lt: now }),
      },
      ...(options.leagueId ? { leagueId: options.leagueId } : {}),
      ...(options.seasonId ? { seasonId: options.seasonId } : {}),
      ...(options.onlyArchiveMatches !== false
        ? {
            providerMappings: {
              some: {
                provider: {
                  code: ARCHIVE_PROVIDER_CODE,
                },
              },
            },
          }
        : {}),
    };
  }

  private computeStandingsRows(
    leagueId: string,
    seasonId: string,
    matches: Array<{
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number | null;
      awayScore: number | null;
    }>,
  ): Prisma.StandingsSnapshotCreateManyInput[] {
    const table = new Map<string, StandingAccumulator>();

    for (const match of matches) {
      const homeGoals = Number(match.homeScore ?? 0);
      const awayGoals = Number(match.awayScore ?? 0);
      const home = table.get(match.homeTeamId) ?? this.emptyStanding(match.homeTeamId);
      const away = table.get(match.awayTeamId) ?? this.emptyStanding(match.awayTeamId);

      home.played += 1;
      away.played += 1;
      home.goalsFor += homeGoals;
      home.goalsAgainst += awayGoals;
      away.goalsFor += awayGoals;
      away.goalsAgainst += homeGoals;

      const homeResult = this.resolveResult(homeGoals, awayGoals);
      const awayResult = this.resolveResult(awayGoals, homeGoals);
      this.applyStandingResult(home, homeResult);
      this.applyStandingResult(away, awayResult);

      table.set(match.homeTeamId, home);
      table.set(match.awayTeamId, away);
    }

    const sorted = [...table.values()].sort((left, right) => {
      const pointsDiff = right.points - left.points;
      if (pointsDiff !== 0) return pointsDiff;

      const goalDiff = right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst);
      if (goalDiff !== 0) return goalDiff;

      const goalsDiff = right.goalsFor - left.goalsFor;
      if (goalsDiff !== 0) return goalsDiff;

      return left.teamId.localeCompare(right.teamId);
    });

    return sorted.map((entry, index) => ({
      leagueId,
      seasonId,
      teamId: entry.teamId,
      rank: index + 1,
      played: entry.played,
      wins: entry.wins,
      draws: entry.draws,
      losses: entry.losses,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      points: entry.points,
      form: entry.recent.join(''),
    }));
  }

  private applyStandingResult(entry: StandingAccumulator, result: 'W' | 'D' | 'L') {
    entry.recent.push(result);
    if (entry.recent.length > 5) {
      entry.recent.shift();
    }

    if (result === 'W') {
      entry.wins += 1;
      entry.points += 3;
      return;
    }

    if (result === 'D') {
      entry.draws += 1;
      entry.points += 1;
      return;
    }

    entry.losses += 1;
  }

  private emptyStanding(teamId: string): StandingAccumulator {
    return {
      teamId,
      wins: 0,
      draws: 0,
      losses: 0,
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      recent: [],
    };
  }

  private accumulateRecentForm(
    formByTeam: Map<string, FormAccumulator>,
    teamId: string,
    leagueId: string,
    goalsFor: number,
    goalsAgainst: number,
  ) {
    const entry =
      formByTeam.get(teamId) ??
      {
        wins: 0,
        draws: 0,
        losses: 0,
        scored: 0,
        conceded: 0,
        sampleSize: 0,
        recent: [],
        leagueId,
      };

    if (entry.sampleSize >= 5) {
      formByTeam.set(teamId, entry);
      return;
    }

    const result = this.resolveResult(goalsFor, goalsAgainst);
    entry.sampleSize += 1;
    entry.scored += goalsFor;
    entry.conceded += goalsAgainst;
    entry.recent.push(result);
    entry.leagueId = entry.leagueId ?? leagueId;

    if (result === 'W') {
      entry.wins += 1;
    } else if (result === 'D') {
      entry.draws += 1;
    } else {
      entry.losses += 1;
    }

    formByTeam.set(teamId, entry);
  }

  private resolveResult(goalsFor: number, goalsAgainst: number): 'W' | 'D' | 'L' {
    if (goalsFor > goalsAgainst) {
      return 'W';
    }
    if (goalsFor === goalsAgainst) {
      return 'D';
    }
    return 'L';
  }

  private async invalidateFootballCaches() {
    await Promise.all([
      this.cacheService.delByPrefix('analytics:'),
      this.cacheService.delByPrefix('predictions:'),
      this.cacheService.delByPrefix('matches:'),
      this.cacheService.delByPrefix('standings:'),
      this.cacheService.delByPrefix('leagues:'),
    ]);
  }
}
