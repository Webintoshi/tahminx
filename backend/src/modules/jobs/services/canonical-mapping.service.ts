import { Injectable } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

interface LeagueMappingInput {
  providerId: string;
  sportId: string;
  externalId: string;
  externalName: string;
  country?: string;
  logoUrl?: string;
  rawPayload?: Record<string, unknown>;
}

interface TeamMappingInput {
  providerId: string;
  sportId: string;
  externalId: string;
  externalName: string;
  shortName?: string;
  country?: string;
  logoUrl?: string;
  venue?: string;
  rawPayload?: Record<string, unknown>;
}

interface MatchMappingInput {
  providerId: string;
  sportId: string;
  leagueId: string;
  seasonId?: string;
  externalId: string;
  homeTeamId?: string;
  awayTeamId?: string;
  matchDate: Date;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  rawPayload?: Record<string, unknown>;
}

@Injectable()
export class CanonicalMappingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveLeague(input: LeagueMappingInput): Promise<string | null> {
    const existing = await this.prisma.providerLeagueMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId: input.providerId,
          externalId: input.externalId,
        },
      },
    });

    if (existing?.leagueId) {
      return existing.leagueId;
    }

    const candidates = await this.prisma.league.findMany({
      where: { deletedAt: null, sportId: input.sportId },
      select: { id: true, name: true, country: true },
    });

    const best = this.pickBestByName(input.externalName, candidates.map((candidate) => ({
      id: candidate.id,
      name: `${candidate.name} ${candidate.country || ''}`,
    })));

    if (best && best.score >= 0.95) {
      await this.prisma.providerLeagueMapping.upsert({
        where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
        create: {
          providerId: input.providerId,
          leagueId: best.id,
          externalId: input.externalId,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: false,
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
        update: {
          leagueId: best.id,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: false,
          reviewReason: null,
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
      });

      await this.logMapping('LEAGUE_MAPPING_CONFIDENT', input.externalId, best.id, {
        score: best.score,
        externalName: input.externalName,
      });
      return best.id;
    }

    if (best && best.score >= 0.9) {
      await this.prisma.providerLeagueMapping.upsert({
        where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
        create: {
          providerId: input.providerId,
          leagueId: null,
          externalId: input.externalId,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: true,
          reviewReason: 'Ambiguous name similarity for league mapping',
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
        update: {
          leagueId: null,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: true,
          reviewReason: 'Ambiguous name similarity for league mapping',
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
      });

      await this.logMapping('LEAGUE_MAPPING_REVIEW_NEEDED', input.externalId, null, {
        score: best.score,
        externalName: input.externalName,
      });
      return null;
    }

    const slugBase = slugify(`${input.externalName}-${input.country || ''}`);
    const slug = await this.ensureUniqueSlug('league', slugBase);

    const league = await this.prisma.league.create({
      data: {
        sportId: input.sportId,
        name: input.externalName,
        country: input.country,
        logoUrl: input.logoUrl,
        slug,
        isActive: true,
      },
    });

    await this.prisma.providerLeagueMapping.upsert({
      where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
      create: {
        providerId: input.providerId,
        leagueId: league.id,
        externalId: input.externalId,
        externalName: input.externalName,
        confidence: 0.87,
        reviewNeeded: false,
        rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
      },
      update: {
        leagueId: league.id,
        externalName: input.externalName,
        confidence: 0.87,
        reviewNeeded: false,
        reviewReason: null,
        rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
      },
    });

    await this.logMapping('LEAGUE_MAPPING_CREATED', input.externalId, league.id, {
      externalName: input.externalName,
    });

    return league.id;
  }

  async resolveTeam(input: TeamMappingInput): Promise<string | null> {
    const existing = await this.prisma.providerTeamMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId: input.providerId,
          externalId: input.externalId,
        },
      },
    });

    if (existing?.teamId) {
      return existing.teamId;
    }

    const candidates = await this.prisma.team.findMany({
      where: {
        deletedAt: null,
        sportId: input.sportId,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        country: true,
      },
    });

    const best = this.pickBestByName(
      `${input.externalName} ${input.shortName || ''} ${input.country || ''}`,
      candidates.map((candidate) => ({
        id: candidate.id,
        name: `${candidate.name} ${candidate.shortName || ''} ${candidate.country || ''}`,
      })),
    );

    if (best && best.score >= 0.95) {
      await this.prisma.providerTeamMapping.upsert({
        where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
        create: {
          providerId: input.providerId,
          teamId: best.id,
          externalId: input.externalId,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: false,
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
        update: {
          teamId: best.id,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: false,
          reviewReason: null,
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
      });

      await this.logMapping('TEAM_MAPPING_CONFIDENT', input.externalId, best.id, {
        score: best.score,
      });
      return best.id;
    }

    if (best && best.score >= 0.9) {
      await this.prisma.providerTeamMapping.upsert({
        where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
        create: {
          providerId: input.providerId,
          teamId: null,
          externalId: input.externalId,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: true,
          reviewReason: 'Ambiguous name similarity for team mapping',
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
        update: {
          teamId: null,
          externalName: input.externalName,
          confidence: Number(best.score.toFixed(4)),
          reviewNeeded: true,
          reviewReason: 'Ambiguous name similarity for team mapping',
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
      });

      await this.logMapping('TEAM_MAPPING_REVIEW_NEEDED', input.externalId, null, {
        score: best.score,
      });

      return null;
    }

    const slugBase = slugify(`${input.externalName}-${input.shortName || ''}`);
    const slug = await this.ensureUniqueSlug('team', slugBase);

    const team = await this.prisma.team.create({
      data: {
        sportId: input.sportId,
        name: input.externalName,
        shortName: input.shortName,
        country: input.country,
        logoUrl: input.logoUrl,
        venue: input.venue,
        slug,
      },
    });

    await this.prisma.providerTeamMapping.upsert({
      where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
      create: {
        providerId: input.providerId,
        teamId: team.id,
        externalId: input.externalId,
        externalName: input.externalName,
        confidence: 0.86,
        reviewNeeded: false,
        rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
      },
      update: {
        teamId: team.id,
        externalName: input.externalName,
        confidence: 0.86,
        reviewNeeded: false,
        reviewReason: null,
        rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
      },
    });

    await this.logMapping('TEAM_MAPPING_CREATED', input.externalId, team.id, {
      name: input.externalName,
    });

    return team.id;
  }

  async resolveMatch(input: MatchMappingInput): Promise<string | null> {
    const existing = await this.prisma.providerMatchMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId: input.providerId,
          externalId: input.externalId,
        },
      },
    });

    if (existing?.matchId) {
      await this.prisma.match.update({
        where: { id: existing.matchId },
        data: {
          matchDate: input.matchDate,
          status: input.status,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          venue: input.venue,
          seasonId: input.seasonId,
        },
      });
      return existing.matchId;
    }

    if (!input.homeTeamId || !input.awayTeamId) {
      await this.prisma.providerMatchMapping.upsert({
        where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
        create: {
          providerId: input.providerId,
          matchId: null,
          externalId: input.externalId,
          confidence: 0,
          reviewNeeded: true,
          reviewReason: 'Missing canonical team mapping',
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
        update: {
          matchId: null,
          confidence: 0,
          reviewNeeded: true,
          reviewReason: 'Missing canonical team mapping',
          rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
        },
      });

      await this.logMapping('MATCH_MAPPING_REVIEW_NEEDED', input.externalId, null, {
        reason: 'Missing canonical team mapping',
      });
      return null;
    }

    const from = new Date(input.matchDate.getTime() - 12 * 60 * 60 * 1000);
    const to = new Date(input.matchDate.getTime() + 12 * 60 * 60 * 1000);

    const candidates = await this.prisma.match.findMany({
      where: {
        leagueId: input.leagueId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        matchDate: { gte: from, lte: to },
      },
      select: { id: true, matchDate: true },
    });

    let matchId: string;
    let confidence = 0.88;

    if (candidates.length === 1) {
      matchId = candidates[0].id;
      const diffMinutes = Math.abs(candidates[0].matchDate.getTime() - input.matchDate.getTime()) / 60000;
      confidence = Math.max(0.9, 1 - diffMinutes / 720);
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          matchDate: input.matchDate,
          status: input.status,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          venue: input.venue,
          seasonId: input.seasonId,
        },
      });
    } else if (candidates.length > 1) {
      const sorted = candidates
        .map((candidate) => ({
          id: candidate.id,
          diff: Math.abs(candidate.matchDate.getTime() - input.matchDate.getTime()),
        }))
        .sort((a, b) => a.diff - b.diff);

      const winner = sorted[0];
      const runnerUp = sorted[1];
      const margin = runnerUp ? runnerUp.diff - winner.diff : Number.MAX_SAFE_INTEGER;

      if (winner.diff <= 90 * 60 * 1000 && margin >= 90 * 60 * 1000) {
        matchId = winner.id;
        confidence = 0.9;
        await this.prisma.match.update({
          where: { id: matchId },
          data: {
            matchDate: input.matchDate,
            status: input.status,
            homeScore: input.homeScore,
            awayScore: input.awayScore,
            venue: input.venue,
            seasonId: input.seasonId,
          },
        });
      } else {
        await this.prisma.providerMatchMapping.upsert({
          where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
          create: {
            providerId: input.providerId,
            matchId: null,
            externalId: input.externalId,
            confidence: 0,
            reviewNeeded: true,
            reviewReason: 'Multiple canonical match candidates with similar kickoff time',
            rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
          },
          update: {
            matchId: null,
            confidence: 0,
            reviewNeeded: true,
            reviewReason: 'Multiple canonical match candidates with similar kickoff time',
            rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
          },
        });

        await this.logMapping('MATCH_MAPPING_REVIEW_NEEDED', input.externalId, null, {
          reason: 'Multiple canonical match candidates with similar kickoff time',
        });

        return null;
      }
    } else {
      const created = await this.prisma.match.create({
        data: {
          sportId: input.sportId,
          leagueId: input.leagueId,
          seasonId: input.seasonId,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          matchDate: input.matchDate,
          status: input.status,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          venue: input.venue,
        },
      });

      matchId = created.id;
      confidence = 0.88;
      await this.logMapping('MATCH_MAPPING_CREATED', input.externalId, matchId, {
        status: input.status,
      });
    }

    await this.prisma.providerMatchMapping.upsert({
      where: { providerId_externalId: { providerId: input.providerId, externalId: input.externalId } },
      create: {
        providerId: input.providerId,
        matchId,
        externalId: input.externalId,
        confidence,
        reviewNeeded: false,
        reviewReason: null,
        rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
      },
      update: {
        matchId,
        confidence,
        reviewNeeded: false,
        reviewReason: null,
        rawPayload: input.rawPayload as Prisma.InputJsonValue | undefined,
      },
    });

    return matchId;
  }

  async resolveSeason(leagueId: string, seasonExternalId?: string, matchDate?: Date): Promise<string> {
    const explicitYear = seasonExternalId ? Number(seasonExternalId) : NaN;
    const year = Number.isFinite(explicitYear) && explicitYear > 1900 ? explicitYear : (matchDate || new Date()).getUTCFullYear();

    const season = await this.prisma.season.upsert({
      where: {
        leagueId_seasonYear: {
          leagueId,
          seasonYear: year,
        },
      },
      create: {
        leagueId,
        seasonYear: year,
        name: String(year),
        isCurrent: true,
      },
      update: {
        isCurrent: true,
      },
    });

    return season.id;
  }

  private async ensureUniqueSlug(kind: 'league' | 'team', base: string): Promise<string> {
    let attempt = 0;
    let slug = base || `${kind}-item`;

    while (attempt < 10) {
      const exists =
        kind === 'league'
          ? await this.prisma.league.findUnique({ where: { slug }, select: { id: true } })
          : await this.prisma.team.findUnique({ where: { slug }, select: { id: true } });

      if (!exists) {
        return slug;
      }

      attempt += 1;
      slug = `${base}-${attempt}`;
    }

    return `${base}-${Date.now()}`;
  }

  private pickBestByName(
    source: string,
    candidates: Array<{ id: string; name: string }>,
  ): { id: string; score: number } | null {
    const normalizedSource = normalizeName(source);
    if (!normalizedSource || !candidates.length) {
      return null;
    }

    let best: { id: string; score: number } | null = null;

    for (const candidate of candidates) {
      const score = nameSimilarity(normalizedSource, normalizeName(candidate.name));
      if (!best || score > best.score) {
        best = { id: candidate.id, score };
      }
    }

    return best;
  }

  private async logMapping(action: string, externalId: string, canonicalId: string | null, payload: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: {
        action,
        targetType: 'provider_mapping',
        targetId: canonicalId,
        payload: {
          externalId,
          ...payload,
        } as Prisma.InputJsonValue,
      },
    });
  }
}

const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const nameSimilarity = (a: string, b: string): number => {
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }

  const tokensA = new Set(a.split(' '));
  const tokensB = new Set(b.split(' '));
  const common = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  const jaccard = union ? common / union : 0;
  const edit = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const editScore = maxLen ? 1 - edit / maxLen : 0;

  return Number((jaccard * 0.6 + editScore * 0.4).toFixed(4));
};

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () => []);

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');