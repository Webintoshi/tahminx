import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { IngestionStatus, MatchStatus, Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { AlertingService } from 'src/common/alerts/alerting.service';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { LiveService } from 'src/modules/live/live.service';
import { ProvidersService } from 'src/modules/providers/providers.service';
import { ProviderAdapter } from 'src/modules/providers/interfaces/provider-adapter.interface';
import { NormalizedLeague, NormalizedMatch, NormalizedPlayer } from 'src/modules/providers/interfaces/normalized.types';
import { DEFAULT_SUPPORTED_LEAGUES, SupportedLeagueConfig } from 'src/shared/constants/ingestion.constants';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { JobsService } from '../jobs.service';
import { CanonicalMappingService } from '../services/canonical-mapping.service';

interface IngestionResultSummary {
  jobName: string;
  providers: Record<string, Record<string, number>>;
  touchedMatchIds: string[];
  warnings: string[];
}

@Injectable()
@Processor(QUEUE_NAMES.INGESTION, {
  concurrency: Math.max(1, Number(process.env.QUEUE_INGESTION_CONCURRENCY || 4)),
  stalledInterval: Math.max(5000, Number(process.env.QUEUE_STALLED_INTERVAL_MS || 30000)),
})
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: ProvidersService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
    private readonly liveService: LiveService,
    private readonly mappingService: CanonicalMappingService,
    private readonly jobsService: JobsService,
  ) {
    super();
  }

  async process(job: Job<{ ingestionJobId?: string; providerCode?: string }>): Promise<unknown> {
    const startedAt = Date.now();
    const ingestionJobId = String(job.data?.ingestionJobId || '');
    let runId: string | null = null;

    if (ingestionJobId) {
      const run = await this.prisma.ingestionJobRun.create({
        data: {
          ingestionJobId,
          status: IngestionStatus.RUNNING,
          startedAt: new Date(),
          attempt: job.attemptsMade + 1,
        },
      });
      runId = run.id;

      await this.prisma.ingestionJob.update({
        where: { id: ingestionJobId },
        data: { status: IngestionStatus.RUNNING, startedAt: new Date(), errorMessage: null },
      });
    }

    const summary: IngestionResultSummary = {
      jobName: job.name,
      providers: {},
      touchedMatchIds: [],
      warnings: [],
    };

    try {
      const supportedLeagues = await this.getSupportedLeagues();
      const providerCodes = await this.resolveProviderCodes(job.data?.providerCode, this.jobSport(job.name));

      if (!providerCodes.length) {
        summary.warnings.push('No active provider available for requested job');
      }

      let successfulProviderRuns = 0;
      for (const providerCode of providerCodes) {
        try {
          const adapter = this.providersService.getAdapterByCode(providerCode);
          const provider = await this.prisma.provider.findUnique({ where: { code: providerCode } });
          if (!provider) {
            summary.warnings.push(`Provider row missing for code=${providerCode}`);
            continue;
          }

          const providerSupportedLeagues = supportedLeagues.filter((item) => item.providerCode === providerCode);

          switch (job.name) {
            case JOB_NAMES.syncLeagues:
              summary.providers[providerCode] = await this.syncLeagues(provider.id, adapter, providerSupportedLeagues);
              await this.cacheService.delByPrefix('standings:');
              await this.cacheService.delByPrefix('leagues:detail:');
              break;
            case JOB_NAMES.syncSeasons:
              summary.providers[providerCode] = await this.syncSeasons(provider.id, adapter);
              await this.cacheService.delByPrefix('leagues:detail:');
              break;
            case JOB_NAMES.syncTeams:
              summary.providers[providerCode] = await this.syncTeams(provider.id, adapter, providerSupportedLeagues);
              break;
            case JOB_NAMES.syncPlayers:
              summary.providers[providerCode] = await this.syncPlayers(provider.id, adapter);
              break;
            case JOB_NAMES.syncFixtures: {
              const { stats, touchedMatchIds } = await this.syncMatches(provider.id, adapter, providerSupportedLeagues, 'fixtures');
              summary.providers[providerCode] = stats;
              summary.touchedMatchIds.push(...touchedMatchIds);
              await this.cacheService.del(touchedMatchIds.map((matchId) => CacheKeys.matchDetail(matchId)));
              await this.cacheService.del([CacheKeys.dashboardSummary()]);
              break;
            }
            case JOB_NAMES.syncResults: {
              const { stats, touchedMatchIds } = await this.syncMatches(provider.id, adapter, providerSupportedLeagues, 'results');
              summary.providers[providerCode] = stats;
              summary.touchedMatchIds.push(...touchedMatchIds);
              await this.cacheService.del(touchedMatchIds.map((matchId) => CacheKeys.matchDetail(matchId)));
              await this.cacheService.del([CacheKeys.dashboardSummary()]);
              break;
            }
            case JOB_NAMES.syncStandings: {
              const standings = await this.syncStandings(provider.id, adapter);
              summary.providers[providerCode] = {
                processed: standings.processed,
                upserted: standings.upserted,
                review: standings.review,
              };
              await this.cacheService.del(
                standings.touchedLeagueIds.flatMap((leagueId) => [CacheKeys.leagueStandings(leagueId), CacheKeys.leagueDetail(leagueId)]),
              );
              break;
            }
            case JOB_NAMES.syncTeamStats:
              summary.providers[providerCode] = await this.syncTeamStats(provider.id, adapter);
              break;
            case JOB_NAMES.syncPlayerStats:
              summary.providers[providerCode] = await this.syncPlayerStats(provider.id, adapter);
              break;
            case JOB_NAMES.syncMatchEvents: {
              const eventSync = await this.syncMatchEvents(provider.id, adapter);
              summary.providers[providerCode] = {
                processed: eventSync.processed,
                upserted: eventSync.upserted,
              };
              await this.cacheService.del(eventSync.touchedMatchIds.map((matchId) => CacheKeys.matchDetail(matchId)));
              break;
            }
            default:
              this.logger.log(`No-op ingestion job: ${job.name}`);
          }

          successfulProviderRuns += 1;
        } catch (providerError) {
          const providerErrorMessage = (providerError as Error).message;
          summary.warnings.push(`Provider ${providerCode} failed: ${providerErrorMessage}`);
          await this.alertingService.raise({
            type: 'provider_ingestion_failure',
            severity: 'warning',
            message: `Provider ingestion failed provider=${providerCode} job=${job.name}`,
            context: {
              jobName: job.name,
              providerCode,
              error: providerErrorMessage,
            },
          });
        }
      }

      if (providerCodes.length > 0 && successfulProviderRuns === 0 && job.name !== JOB_NAMES.recalculateForms) {
        throw new Error(`All providers failed for job ${job.name}`);
      }

      if (job.name === JOB_NAMES.recalculateForms) {
        const formStats = await this.recalculateForms();
        summary.providers.system = formStats;
      }

      if (summary.touchedMatchIds.length && [JOB_NAMES.syncFixtures, JOB_NAMES.syncResults].includes(job.name as any)) {
        await this.jobsService.enqueueFeatureBatch(summary.touchedMatchIds, `sync:${job.name}`);
      }

      if (ingestionJobId) {
        await this.prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: { status: IngestionStatus.SUCCESS, finishedAt: new Date() },
        });
      }

      if (runId) {
        await this.prisma.ingestionJobRun.update({
          where: { id: runId },
          data: {
            status: IngestionStatus.SUCCESS,
            finishedAt: new Date(),
            resultPayload: summary as unknown as Prisma.InputJsonValue,
            rawPayload: {
              touchedMatchIds: summary.touchedMatchIds.slice(0, 50),
              warnings: summary.warnings,
            } as Prisma.InputJsonValue,
          },
        });
      }

      this.metricsService.recordIngestionRun(job.name, 'success');
      this.metricsService.observeQueueJob(QUEUE_NAMES.INGESTION, job.name, 'success', Date.now() - startedAt);
      return { ok: true, summary };
    } catch (error) {
      const message = (error as Error).message;
      this.metricsService.recordIngestionRun(job.name, 'failed');
      this.metricsService.observeQueueJob(QUEUE_NAMES.INGESTION, job.name, 'failed', Date.now() - startedAt);
      this.logger.error(`Ingestion job failed ${job.name}: ${message}`);
      await this.alertingService.raise({
        type: 'queue_failure',
        severity: 'critical',
        message: `Ingestion queue job failed: ${job.name}`,
        context: {
          jobId: String(job.id || ''),
          attemptsMade: job.attemptsMade,
          error: message,
        },
      });

      if (ingestionJobId) {
        const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
        const status = isFinalAttempt ? IngestionStatus.DEAD_LETTER : IngestionStatus.FAILED;
        await this.prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: { status, errorMessage: message, finishedAt: new Date() },
        });

        if (isFinalAttempt) {
          await this.jobsService.markDeadLetter(ingestionJobId, message);
        }
      }

      if (runId) {
        await this.prisma.ingestionJobRun.update({
          where: { id: runId },
          data: {
            status: IngestionStatus.FAILED,
            errorMessage: message,
            finishedAt: new Date(),
            resultPayload: summary as unknown as Prisma.InputJsonValue,
          },
        });
      }

      throw error;
    }
  }

  private async syncLeagues(providerId: string, adapter: ProviderAdapter, supportedLeagues: SupportedLeagueConfig[]) {
    const sportMap = await this.getSportMap();
    const leagues = await adapter.getLeagues();

    let processed = 0;
    let mapped = 0;
    let review = 0;
    let seasonsUpserted = 0;

    for (const league of leagues) {
      if (!this.isLeagueSupported(league, supportedLeagues)) {
        continue;
      }

      processed += 1;

      const sportId = sportMap[league.sportCode];
      if (!sportId) {
        continue;
      }

      const leagueId = await this.mappingService.resolveLeague({
        providerId,
        sportId,
        externalId: league.externalId,
        externalName: league.name,
        country: league.country,
        logoUrl: league.logoUrl,
        rawPayload: league.rawPayload,
      });

      if (!leagueId) {
        review += 1;
        continue;
      }

      mapped += 1;

      const seasons = await adapter.getSeasons(league.externalId);
      for (const season of seasons) {
        await this.prisma.season.upsert({
          where: {
            leagueId_seasonYear: {
              leagueId,
              seasonYear: season.seasonYear,
            },
          },
          create: {
            leagueId,
            seasonYear: season.seasonYear,
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
          update: {
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
        });
        seasonsUpserted += 1;
      }
    }

    return {
      processed,
      mapped,
      review,
      seasonsUpserted,
    };
  }

  private async syncSeasons(providerId: string, adapter: ProviderAdapter) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
    });

    let processed = 0;
    let upserted = 0;

    for (const mapping of leagueMappings) {
      processed += 1;
      const seasons = await adapter.getSeasons(mapping.externalId);
      for (const season of seasons) {
        await this.prisma.season.upsert({
          where: {
            leagueId_seasonYear: {
              leagueId: mapping.leagueId as string,
              seasonYear: season.seasonYear,
            },
          },
          create: {
            leagueId: mapping.leagueId as string,
            seasonYear: season.seasonYear,
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
          update: {
            name: season.name,
            startDate: season.startDate ? new Date(season.startDate) : null,
            endDate: season.endDate ? new Date(season.endDate) : null,
            isCurrent: season.isCurrent ?? false,
          },
        });
        upserted += 1;
      }
    }

    return { processed, upserted };
  }

  private async syncTeams(providerId: string, adapter: ProviderAdapter, supportedLeagues: SupportedLeagueConfig[]) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
      include: { league: true },
    });

    let processed = 0;
    let mapped = 0;
    let review = 0;

    for (const leagueMapping of leagueMappings) {
      if (!leagueMapping.league) {
        continue;
      }

      if (!this.isLeagueMappingSupported(leagueMapping.externalId, leagueMapping.league.name, supportedLeagues)) {
        continue;
      }

      const teams = await adapter.getTeams(leagueMapping.externalId);
      for (const team of teams) {
        processed += 1;
        const teamId = await this.mappingService.resolveTeam({
          providerId,
          sportId: leagueMapping.league.sportId,
          externalId: team.externalId,
          externalName: team.name,
          shortName: team.shortName,
          country: team.country,
          logoUrl: team.logoUrl,
          venue: team.venue,
          rawPayload: team.rawPayload,
        });

        if (teamId) {
          mapped += 1;
        } else {
          review += 1;
        }
      }
    }

    return {
      processed,
      mapped,
      review,
    };
  }

  private async syncPlayers(providerId: string, adapter: ProviderAdapter) {
    const teamMappings = await this.prisma.providerTeamMapping.findMany({
      where: { providerId, reviewNeeded: false, teamId: { not: null } },
      take: 120,
    });

    let processed = 0;
    let upserted = 0;

    for (const teamMapping of teamMappings) {
      const players = await adapter.getPlayers(teamMapping.externalId);
      for (const player of players) {
        processed += 1;
        if (!player.externalId) {
          continue;
        }

        await this.upsertPlayerFromProvider(adapter.code, player, teamMapping.teamId as string);
        upserted += 1;
      }
    }

    return {
      processed,
      upserted,
    };
  }

  private async syncMatches(
    providerId: string,
    adapter: ProviderAdapter,
    supportedLeagues: SupportedLeagueConfig[],
    mode: 'fixtures' | 'results',
  ) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
      include: { league: true },
    });

    const touchedMatchIds: string[] = [];
    let processed = 0;
    let mapped = 0;
    let review = 0;

    const today = new Date();
    const from = mode === 'fixtures' ? formatDate(today) : formatDate(new Date(today.getTime() - 30 * 86400000));
    const to = mode === 'fixtures' ? formatDate(new Date(today.getTime() + 7 * 86400000)) : formatDate(today);

    for (const leagueMapping of leagueMappings) {
      if (!leagueMapping.league) {
        continue;
      }

      if (!this.isLeagueMappingSupported(leagueMapping.externalId, leagueMapping.league.name, supportedLeagues)) {
        continue;
      }

      const matches = await adapter.getMatches({
        from,
        to,
        leagueExternalId: leagueMapping.externalId,
      });

      for (const match of matches) {
        processed += 1;
        const mappedId = await this.upsertNormalizedMatch(providerId, leagueMapping.league.sportId, leagueMapping.leagueId as string, match);
        if (mappedId) {
          mapped += 1;
          touchedMatchIds.push(mappedId);
        } else {
          review += 1;
        }
      }
    }

    return {
      stats: {
        processed,
        mapped,
        review,
      },
      touchedMatchIds,
    };
  }

  private async syncStandings(providerId: string, adapter: ProviderAdapter) {
    const leagueMappings = await this.prisma.providerLeagueMapping.findMany({
      where: { providerId, reviewNeeded: false, leagueId: { not: null } },
      include: { league: true },
    });

    const touchedLeagueIds = new Set<string>();
    let processed = 0;
    let upserted = 0;
    let review = 0;

    for (const leagueMapping of leagueMappings) {
      if (!leagueMapping.leagueId || !leagueMapping.league) {
        continue;
      }

      touchedLeagueIds.add(leagueMapping.leagueId);

      const standings = await adapter.getStandings(leagueMapping.externalId);
      const seasonId = await this.mappingService.resolveSeason(leagueMapping.leagueId, String(new Date().getUTCFullYear()));

      for (const standing of standings) {
        processed += 1;

        const teamMapping = await this.prisma.providerTeamMapping.findUnique({
          where: {
            providerId_externalId: {
              providerId,
              externalId: standing.externalTeamId,
            },
          },
        });

        if (!teamMapping?.teamId) {
          await this.prisma.providerTeamMapping.upsert({
            where: {
              providerId_externalId: {
                providerId,
                externalId: standing.externalTeamId,
              },
            },
            create: {
              providerId,
              teamId: null,
              externalId: standing.externalTeamId,
              externalName: null,
              confidence: 0,
              reviewNeeded: true,
              reviewReason: 'Standings row has no canonical team mapping',
              rawPayload: standing.rawPayload as Prisma.InputJsonValue | undefined,
            },
            update: {
              reviewNeeded: true,
              reviewReason: 'Standings row has no canonical team mapping',
              rawPayload: standing.rawPayload as Prisma.InputJsonValue | undefined,
            },
          });
          review += 1;
          continue;
        }

        await this.prisma.standingsSnapshot.upsert({
          where: {
            leagueId_seasonId_teamId: {
              leagueId: leagueMapping.leagueId,
              seasonId,
              teamId: teamMapping.teamId,
            },
          },
          create: {
            leagueId: leagueMapping.leagueId,
            seasonId,
            teamId: teamMapping.teamId,
            rank: standing.rank,
            played: standing.played,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            points: standing.points,
            form: standing.form,
          },
          update: {
            rank: standing.rank,
            played: standing.played,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            points: standing.points,
            form: standing.form,
          },
        });
        upserted += 1;
      }
    }

    return {
      processed,
      upserted,
      review,
      touchedLeagueIds: [...touchedLeagueIds],
    };
  }

  private async syncTeamStats(providerId: string, adapter: ProviderAdapter) {
    const providerMatchMappings = await this.loadActiveProviderMatchMappings(providerId);
    let processed = 0;
    let upserted = 0;

    for (const mapping of providerMatchMappings) {
      const stats = await adapter.getTeamStats(mapping.externalId);
      for (const stat of stats) {
        processed += 1;
        const teamMapping = await this.prisma.providerTeamMapping.findUnique({
          where: {
            providerId_externalId: {
              providerId,
              externalId: stat.externalTeamId,
            },
          },
        });

        if (!teamMapping?.teamId || !mapping.matchId) {
          continue;
        }

        await this.prisma.teamStat.upsert({
          where: {
            matchId_teamId: {
              matchId: mapping.matchId,
              teamId: teamMapping.teamId,
            },
          },
          create: {
            matchId: mapping.matchId,
            teamId: teamMapping.teamId,
            possession: stat.possession,
            shots: stat.shots,
            shotsOnTarget: stat.shotsOnTarget,
            corners: stat.corners,
            fouls: stat.fouls,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
          update: {
            possession: stat.possession,
            shots: stat.shots,
            shotsOnTarget: stat.shotsOnTarget,
            corners: stat.corners,
            fouls: stat.fouls,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
        });
        upserted += 1;
      }
    }

    return { processed, upserted };
  }

  private async syncPlayerStats(providerId: string, adapter: ProviderAdapter) {
    const providerMatchMappings = await this.loadActiveProviderMatchMappings(providerId);
    let processed = 0;
    let upserted = 0;

    for (const mapping of providerMatchMappings) {
      const stats = await adapter.getPlayerStats(mapping.externalId);
      for (const stat of stats) {
        processed += 1;

        if (!mapping.matchId) {
          continue;
        }

        const playerId = `${adapter.code}-player-${stat.externalPlayerId}`;
        const teamMapping = stat.externalTeamId
          ? await this.prisma.providerTeamMapping.findUnique({
              where: {
                providerId_externalId: {
                  providerId,
                  externalId: stat.externalTeamId,
                },
              },
            })
          : null;

        await this.prisma.player.upsert({
          where: { id: playerId },
          create: {
            id: playerId,
            teamId: teamMapping?.teamId || null,
            name: `Player ${stat.externalPlayerId}`,
          },
          update: {
            teamId: teamMapping?.teamId || undefined,
          },
        });

        await this.prisma.playerStat.upsert({
          where: {
            matchId_playerId: {
              matchId: mapping.matchId,
              playerId,
            },
          },
          create: {
            matchId: mapping.matchId,
            playerId,
            teamId: teamMapping?.teamId || null,
            minutes: stat.minutes,
            points: stat.points,
            assists: stat.assists,
            rebounds: stat.rebounds,
            goals: stat.goals,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
          update: {
            teamId: teamMapping?.teamId || undefined,
            minutes: stat.minutes,
            points: stat.points,
            assists: stat.assists,
            rebounds: stat.rebounds,
            goals: stat.goals,
            payload: stat.payload as Prisma.InputJsonValue | undefined,
          },
        });
        upserted += 1;
      }
    }

    return { processed, upserted };
  }

  private async syncMatchEvents(providerId: string, adapter: ProviderAdapter) {
    const providerMatchMappings = await this.loadActiveProviderMatchMappings(providerId);

    const touchedMatchIds: string[] = [];
    let processed = 0;
    let upserted = 0;

    for (const mapping of providerMatchMappings) {
      const events = await adapter.getMatchEvents(mapping.externalId);
      if (!mapping.matchId) {
        continue;
      }

      touchedMatchIds.push(mapping.matchId);
      const livePayloads: Array<{
        eventType: 'matchEvent';
        matchId: string;
        sport: 'football' | 'basketball';
        leagueId: string | null;
        timestamp: string;
        source: string;
        payload: {
          eventId: string;
          minute: number | null;
          type: string;
          teamId: string | null;
          playerId: string | null;
          data: Record<string, unknown>;
        };
      }> = [];

      await this.prisma.$transaction(async (tx) => {
        await tx.matchEvent.deleteMany({ where: { matchId: mapping.matchId as string } });

        for (const event of events) {
          processed += 1;

          const teamMapping = event.externalTeamId
            ? await tx.providerTeamMapping.findUnique({
                where: {
                  providerId_externalId: {
                    providerId,
                    externalId: event.externalTeamId,
                  },
              },
            })
            : null;

          const created = await tx.matchEvent.create({
            data: {
              matchId: mapping.matchId as string,
              minute: event.minute,
              type: event.type,
              teamId: teamMapping?.teamId || null,
              payload: event.payload as Prisma.InputJsonValue,
            },
          });

          livePayloads.push({
            eventType: 'matchEvent',
            matchId: mapping.matchId as string,
            sport: normalizeSportCode(mapping.match?.sport?.code),
            leagueId: mapping.match?.leagueId || null,
            timestamp: new Date().toISOString(),
            source: `provider:${adapter.code}`,
            payload: {
              eventId: created.id,
              minute: event.minute ?? null,
              type: event.type,
              teamId: teamMapping?.teamId || null,
              playerId: null,
              data: (event.payload as Record<string, unknown>) || {},
            },
          });
          upserted += 1;
        }
      });

      await Promise.all(
        livePayloads.map(async (payload) => {
          try {
            await this.liveService.publishMatchEvent(payload);
          } catch (error) {
            this.logger.warn(
              `Live publish failed matchId=${payload.matchId} eventType=${payload.payload.type} reason=${(error as Error).message}`,
            );
          }
        }),
      );
    }

    return { processed, upserted, touchedMatchIds: [...new Set(touchedMatchIds)] };
  }

  private async recalculateForms() {
    const teams = await this.prisma.team.findMany({ where: { deletedAt: null }, select: { id: true } });
    let updated = 0;

    for (const team of teams) {
      const matches = await this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
          status: MatchStatus.COMPLETED,
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
      });

      if (!matches.length) {
        continue;
      }

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let scored = 0;
      let conceded = 0;
      let formString = '';

      for (const match of matches) {
        const isHome = match.homeTeamId === team.id;
        const gf = Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
        const ga = Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
        scored += gf;
        conceded += ga;

        if (gf > ga) {
          wins += 1;
          formString += 'W';
        } else if (gf === ga) {
          draws += 1;
          formString += 'D';
        } else {
          losses += 1;
          formString += 'L';
        }
      }

      await this.prisma.teamFormSnapshot.create({
        data: {
          teamId: team.id,
          wins,
          draws,
          losses,
          scored,
          conceded,
          formString,
          sampleSize: matches.length,
        },
      });
      updated += 1;
    }

    return { updated };
  }

  private async upsertNormalizedMatch(providerId: string, sportId: string, leagueId: string, match: NormalizedMatch): Promise<string | null> {
    const homeTeamId = await this.resolveTeamIdForMatch(providerId, sportId, match.homeTeamExternalId, match.rawPayload, 'home');
    const awayTeamId = await this.resolveTeamIdForMatch(providerId, sportId, match.awayTeamExternalId, match.rawPayload, 'away');

    const seasonId = await this.mappingService.resolveSeason(leagueId, match.seasonExternalId, new Date(match.matchDate));

    return this.mappingService.resolveMatch({
      providerId,
      sportId,
      leagueId,
      seasonId,
      externalId: match.externalId,
      homeTeamId: homeTeamId || undefined,
      awayTeamId: awayTeamId || undefined,
      matchDate: new Date(match.matchDate),
      status: match.status as MatchStatus,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      venue: match.venue,
      rawPayload: match.rawPayload,
    });
  }

  private async resolveTeamIdForMatch(
    providerId: string,
    sportId: string,
    externalId: string,
    rawPayload: Record<string, unknown> | undefined,
    side: 'home' | 'away',
  ): Promise<string | null> {
    const existing = await this.prisma.providerTeamMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId,
        },
      },
    });

    if (existing?.teamId) {
      return existing.teamId;
    }

    const rawTeam = this.extractRawTeamPayload(rawPayload, side) as Record<string, unknown> | null;
    const externalName = String(rawTeam?.name ?? rawTeam?.displayName ?? '').trim();
    if (!externalId || !externalName) {
      return null;
    }

    return this.mappingService.resolveTeam({
      providerId,
      sportId,
      externalId,
      externalName,
      shortName: String(rawTeam?.tla ?? rawTeam?.abbreviation ?? '').trim() || undefined,
      country: String(rawTeam?.country ?? '').trim() || undefined,
      logoUrl: String(rawTeam?.crest ?? rawTeam?.logo ?? '').trim() || undefined,
      venue: String(rawTeam?.venue ?? '').trim() || undefined,
      rawPayload: rawTeam as Record<string, unknown>,
    });
  }

  private extractRawTeamPayload(rawPayload: Record<string, unknown> | undefined, side: 'home' | 'away') {
    if (!rawPayload) {
      return null;
    }

    const directKey = side === 'home' ? 'home_team' : 'away_team';
    const directPayload = rawPayload[directKey];
    if (directPayload && typeof directPayload === 'object') {
      return directPayload;
    }

    const nestedTeams = rawPayload.teams;
    if (nestedTeams && typeof nestedTeams === 'object') {
      const nestedKey = side === 'home' ? 'home' : 'away';
      const nestedPayload = (nestedTeams as Record<string, unknown>)[nestedKey];
      if (nestedPayload && typeof nestedPayload === 'object') {
        return nestedPayload;
      }
    }

    const ballDontLieKey = side === 'home' ? 'home_team' : 'visitor_team';
    const ballDontLiePayload = rawPayload[ballDontLieKey];
    if (ballDontLiePayload && typeof ballDontLiePayload === 'object') {
      return ballDontLiePayload;
    }

    return null;
  }

  private async upsertPlayerFromProvider(providerCode: string, player: NormalizedPlayer, teamId: string) {
    const playerId = `${providerCode}-player-${player.externalId}`;

    await this.prisma.player.upsert({
      where: { id: playerId },
      create: {
        id: playerId,
        teamId,
        name: player.name,
        shortName: player.name,
        nationality: player.nationality,
        position: player.position,
        birthDate: player.birthDate ? new Date(player.birthDate) : null,
        photoUrl: player.photoUrl,
      },
      update: {
        teamId,
        name: player.name,
        shortName: player.name,
        nationality: player.nationality,
        position: player.position,
        birthDate: player.birthDate ? new Date(player.birthDate) : null,
        photoUrl: player.photoUrl,
      },
    });
  }

  private async loadActiveProviderMatchMappings(providerId: string) {
    const from = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return this.prisma.providerMatchMapping.findMany({
      where: {
        providerId,
        reviewNeeded: false,
        matchId: { not: null },
        match: {
          matchDate: { gte: from, lte: to },
          status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.COMPLETED] },
        },
      },
      include: {
        match: {
          select: {
            id: true,
            leagueId: true,
            sport: { select: { code: true } },
          },
        },
      },
    });
  }

  private async resolveProviderCodes(providerCode: string | undefined, sportCode: 'FOOTBALL' | 'BASKETBALL' | null) {
    if (providerCode) {
      const enabled = await this.providersService.isProviderEnabled(providerCode);
      return enabled ? [providerCode] : [];
    }

    return this.providersService.getActiveAdapterCodes(sportCode || undefined);
  }

  private jobSport(_: string): 'FOOTBALL' | 'BASKETBALL' | null {
    return null;
  }

  private async getSupportedLeagues(): Promise<SupportedLeagueConfig[]> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'supportedLeagues' } });
    if (!setting) {
      return DEFAULT_SUPPORTED_LEAGUES;
    }

    const parsed = setting.value as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_SUPPORTED_LEAGUES;
    }

    const leagues = parsed
      .map((item) => item as Partial<SupportedLeagueConfig>)
      .filter((item): item is SupportedLeagueConfig => {
        return Boolean(item.providerCode && item.sportCode && Array.isArray(item.externalIds) && Array.isArray(item.names));
      });

    return leagues.length ? leagues : DEFAULT_SUPPORTED_LEAGUES;
  }

  private isLeagueSupported(league: NormalizedLeague, supportedLeagues: SupportedLeagueConfig[]) {
    if (!supportedLeagues.length) {
      return true;
    }

    const normalizedName = normalize(league.name);
    return supportedLeagues.some((item) => {
      if (item.sportCode !== league.sportCode) {
        return false;
      }
      return (
        item.externalIds.map((id) => normalize(id)).includes(normalize(league.externalId)) ||
        item.names.map((name) => normalize(name)).includes(normalizedName)
      );
    });
  }

  private isLeagueMappingSupported(externalId: string, leagueName: string, supportedLeagues: SupportedLeagueConfig[]) {
    if (!supportedLeagues.length) {
      return true;
    }

    const normalizedExternalId = normalize(externalId);
    const normalizedName = normalize(leagueName);

    return supportedLeagues.some((item) => {
      return (
        item.externalIds.map((id) => normalize(id)).includes(normalizedExternalId) ||
        item.names.map((name) => normalize(name)).includes(normalizedName)
      );
    });
  }

  private async getSportMap(): Promise<Record<string, string>> {
    const sports = await this.prisma.sport.findMany();
    return sports.reduce<Record<string, string>>((acc, sport) => {
      acc[sport.code] = sport.id;
      return acc;
    }, {});
  }
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const normalizeSportCode = (code: string | undefined): 'football' | 'basketball' =>
  String(code || '').toUpperCase() === 'BASKETBALL' ? 'basketball' : 'football';


