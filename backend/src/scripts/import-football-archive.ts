import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { Logger } from '@nestjs/common';
import { MatchStatus, Prisma, PrismaClient, SportCode } from '@prisma/client';
import {
  ARCHIVE_DIVISION_MAP,
  ARCHIVE_PROVIDER_CODE,
  ARCHIVE_PROVIDER_NAME,
  ARCHIVE_TEAM_ALIAS_OVERRIDE_MAP,
  type ArchiveDivisionConfig,
} from './archive/club-football-archive.config';

const DEFAULT_MATCHES_PATH = 'D:\\Futbol verileri 2000-2025\\Matches.csv';
const DEFAULT_ELO_PATH = 'D:\\Futbol verileri 2000-2025\\EloRatings.csv';
const DEFAULT_BATCH_SIZE = 1_000;
const DEFAULT_LOG_EVERY = 10_000;
const ARCHIVE_PROVIDER_BASE_URL = 'https://github.com/xgabora/Club-Football-Match-Data-2000-2025';
const ARCHIVE_RATING_TYPE = 'elo';

type CsvRecord = Record<string, string>;

interface ImportOptions {
  matchesPath: string;
  eloPath: string | null;
  dryRun: boolean;
  teamsOnly: boolean;
  limit: number | null;
  divisions: Set<string> | null;
  logEvery: number;
  batchSize: number;
}

interface TeamSeed {
  teamKey: string;
  canonicalExternalId: string;
  name: string;
  countryCode: string;
  countryName: string;
  internalLookupKey: string;
}

interface AliasSeed {
  externalAlias: string;
  teamKey: string | null;
  externalName: string;
  countryCode: string;
  confidence: number;
  rawPayload: Record<string, unknown>;
}

interface SeasonSeed {
  divisionCode: string;
  leagueSlug: string;
  seasonYear: number;
  seasonName: string;
  startDate: Date;
  endDate: Date;
}

interface MatchBatchRow {
  id: string;
  sportId: string;
  leagueId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchDate: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  rawRow: CsvRecord;
}

interface ImportSummary {
  matchesScanned: number;
  matchesQueued: number;
  matchesInserted: number;
  teamStatsInserted: number;
  matchMappingsInserted: number;
  eloScanned: number;
  eloInserted: number;
  teamsResolved: number;
  newTeamsCreated: number;
  aliasesUpserted: number;
  seasonsUpserted: number;
  skippedDivisions: number;
  skippedInvalidRows: number;
}

const logger = new Logger('FootballArchiveImport');

async function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureFileExists(options.matchesPath, 'Matches.csv');
  if (options.eloPath) {
    ensureFileExists(options.eloPath, 'EloRatings.csv');
  }

  const prisma = new PrismaClient();
  const summary: ImportSummary = {
    matchesScanned: 0,
    matchesQueued: 0,
    matchesInserted: 0,
    teamStatsInserted: 0,
    matchMappingsInserted: 0,
    eloScanned: 0,
    eloInserted: 0,
    teamsResolved: 0,
    newTeamsCreated: 0,
    aliasesUpserted: 0,
    seasonsUpserted: 0,
    skippedDivisions: 0,
    skippedInvalidRows: 0,
  };

  try {
    const selectedDivisions = options.divisions
      ? [...options.divisions].join(',')
      : 'ALL';
    logger.log(
      `Archive import started dryRun=${options.dryRun} teamsOnly=${options.teamsOnly} matches=${options.matchesPath} elo=${options.eloPath || 'SKIP'} divisions=${selectedDivisions} limit=${options.limit ?? 'ALL'}`,
    );

    const countryNameByCode = new Map<string, string>();
    for (const division of ARCHIVE_DIVISION_MAP.values()) {
      countryNameByCode.set(division.countryCode, division.countryName);
    }

    const leagueCodesSeen = new Set<string>();
    const seasonSeeds = new Map<string, SeasonSeed>();
    const teamSeeds = new Map<string, TeamSeed>();
    const aliasSeeds = new Map<string, AliasSeed>();

    await scanMatches({
      matchesPath: options.matchesPath,
      limit: options.limit,
      selectedDivisions: options.divisions,
      onRow: (row) => {
        const division = ARCHIVE_DIVISION_MAP.get(row.Division);
        if (!division) {
          summary.skippedDivisions += 1;
          return;
        }

        const matchDate = parseArchiveDate(row.MatchDate, row.MatchTime);
        if (!matchDate) {
          summary.skippedInvalidRows += 1;
          return;
        }

        leagueCodesSeen.add(division.code);

        const seasonYear = resolveSeasonYear(division, matchDate);
        const seasonKey = `${division.code}:${seasonYear}`;
        const seasonName = formatSeasonName(division, seasonYear);
        const existingSeason = seasonSeeds.get(seasonKey);
        if (!existingSeason) {
          seasonSeeds.set(seasonKey, {
            divisionCode: division.code,
            leagueSlug: division.leagueSlug,
            seasonYear,
            seasonName,
            startDate: matchDate,
            endDate: matchDate,
          });
        } else {
          if (matchDate < existingSeason.startDate) {
            existingSeason.startDate = matchDate;
          }
          if (matchDate > existingSeason.endDate) {
            existingSeason.endDate = matchDate;
          }
        }

        registerTeamAndAlias(teamSeeds, aliasSeeds, division, row.HomeTeam, 'matches');
        registerTeamAndAlias(teamSeeds, aliasSeeds, division, row.AwayTeam, 'matches');
      },
      summary,
      logEvery: options.logEvery,
    });

    if (options.eloPath) {
      await scanElo({
        eloPath: options.eloPath,
        limit: options.limit,
        onRow: (row) => {
          const countryCode = normalizeCountryCode(row.country);
          const countryName = countryNameByCode.get(countryCode);
          if (!countryCode || !countryName) {
            return;
          }
          registerTeamAndAlias(
            teamSeeds,
            aliasSeeds,
            {
              code: `ELO:${countryCode}`,
              countryCode,
              countryName,
              leagueName: 'Historical Ratings',
              leagueSlug: `ratings-${countryCode.toLowerCase()}`,
              tier: 0,
              calendarSeason: true,
            },
            row.club,
            'elo',
          );
        },
        summary,
        logEvery: options.logEvery,
      });
    }

    const dbAvailable = options.dryRun ? await canReachDatabase(prisma) : true;
    if (options.dryRun && !dbAvailable) {
      logger.warn('Dry-run local veritabani olmadan devam ediyor; mevcut kayitlarla exact eslesme yapilmadi.');
    }

    const archiveSport = await ensureFootballSport(prisma, options.dryRun, dbAvailable);
    const archiveProvider = await ensureArchiveProvider(prisma, options.dryRun, dbAvailable);
    const leagueIdByCode = await ensureLeagues(prisma, archiveSport?.id ?? null, archiveProvider?.id ?? null, leagueCodesSeen, options.dryRun, dbAvailable);
    const seasonIdByKey = await ensureSeasons(prisma, leagueIdByCode, seasonSeeds, options.dryRun, dbAvailable, summary);
    const teamIdByKey = await ensureTeams(prisma, archiveSport?.id ?? null, teamSeeds, options.dryRun, dbAvailable, summary);
    await ensureTeamMappings(prisma, archiveProvider?.id ?? null, teamSeeds, teamIdByKey, options.dryRun);
    await ensureTeamAliases(prisma, archiveProvider?.id ?? null, aliasSeeds, teamIdByKey, options.dryRun, summary);

    if (!options.dryRun && !options.teamsOnly) {
      if (!archiveSport?.id || !archiveProvider?.id) {
        throw new Error('Archive provider and football sport must exist before writing match rows.');
      }

      await importMatches({
        prisma,
        options,
        providerId: archiveProvider.id,
        sportId: archiveSport.id,
        leagueIdByCode,
        seasonIdByKey,
        teamIdByKey,
        summary,
      });

      if (options.eloPath) {
        await importElo({
          prisma,
          eloPath: options.eloPath,
          limit: options.limit,
          providerId: archiveProvider.id,
          teamIdByKey,
          summary,
          logEvery: options.logEvery,
        });
      }
    } else if (!options.dryRun) {
      logger.log('Teams-only mode enabled; match and Elo snapshot writes were skipped.');
    }

    logger.log(`Archive import completed ${JSON.stringify(summary)}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureFootballSport(prisma: PrismaClient, dryRun: boolean, dbAvailable: boolean) {
  if (dryRun) {
    if (!dbAvailable) {
      return null;
    }
    return prisma.sport.findUnique({ where: { code: SportCode.FOOTBALL } });
  }

  return prisma.sport.upsert({
    where: { code: SportCode.FOOTBALL },
    create: {
      code: SportCode.FOOTBALL,
      name: 'Football',
      isActive: true,
    },
    update: {
      name: 'Football',
      isActive: true,
    },
  });
}

async function ensureArchiveProvider(prisma: PrismaClient, dryRun: boolean, dbAvailable: boolean) {
  if (dryRun) {
    if (!dbAvailable) {
      return null;
    }
    return prisma.provider.findUnique({ where: { code: ARCHIVE_PROVIDER_CODE } });
  }

  return prisma.provider.upsert({
    where: { code: ARCHIVE_PROVIDER_CODE },
    create: {
      code: ARCHIVE_PROVIDER_CODE,
      name: ARCHIVE_PROVIDER_NAME,
      baseUrl: ARCHIVE_PROVIDER_BASE_URL,
      isActive: false,
    },
    update: {
      name: ARCHIVE_PROVIDER_NAME,
      baseUrl: ARCHIVE_PROVIDER_BASE_URL,
      isActive: false,
    },
  });
}

async function ensureLeagues(
  prisma: PrismaClient,
  sportId: string | null,
  providerId: string | null,
  divisionCodes: Set<string>,
  dryRun: boolean,
  dbAvailable: boolean,
): Promise<Map<string, string>> {
  const leagueIdByCode = new Map<string, string>();
  if (!sportId) {
    if (dryRun) {
      for (const divisionCode of divisionCodes) {
        const division = ARCHIVE_DIVISION_MAP.get(divisionCode);
        if (division) {
          leagueIdByCode.set(divisionCode, `dry-run:${division.leagueSlug}`);
        }
      }
    }
    return leagueIdByCode;
  }

  const existingLeagues = dbAvailable
    ? await prisma.league.findMany({
        where: {
          deletedAt: null,
          sportId,
        },
        select: {
          id: true,
          name: true,
          country: true,
          slug: true,
        },
      })
    : [];
  const existingLeagueByLookupKey = new Map<string, { id: string; slug: string }>();
  const existingLeagueBySlug = new Map<string, { id: string }>();
  for (const league of existingLeagues) {
    existingLeagueByLookupKey.set(
      buildLeagueLookupKey(league.country ?? '', league.name),
      { id: league.id, slug: league.slug },
    );
    existingLeagueBySlug.set(league.slug, { id: league.id });
  }

  const divisionList = [...divisionCodes].sort();
  for (const divisionCode of divisionList) {
    const division = ARCHIVE_DIVISION_MAP.get(divisionCode);
    if (!division) {
      continue;
    }

    let leagueId: string;
    const existingByLookupKey = existingLeagueByLookupKey.get(
      buildLeagueLookupKey(division.countryName, division.leagueName),
    );
    const existingBySlug = existingLeagueBySlug.get(division.leagueSlug);
    if (dryRun) {
      if (!dbAvailable) {
        leagueId = `dry-run:${division.leagueSlug}`;
        leagueIdByCode.set(divisionCode, leagueId);
        continue;
      }
      leagueId = existingByLookupKey?.id ?? existingBySlug?.id ?? `dry-run:${division.leagueSlug}`;
    } else {
      if (existingByLookupKey) {
        const league = await prisma.league.update({
          where: { id: existingByLookupKey.id },
          data: {
            sportId,
            country: division.countryName,
            isActive: true,
          },
          select: { id: true },
        });
        leagueId = league.id;
      } else {
        const league = await prisma.league.upsert({
          where: { slug: division.leagueSlug },
          create: {
            sportId,
            name: division.leagueName,
            slug: division.leagueSlug,
            country: division.countryName,
            isActive: true,
          },
          update: {
            sportId,
            name: division.leagueName,
            country: division.countryName,
            isActive: true,
          },
        });
        leagueId = league.id;
      }
    }

    leagueIdByCode.set(divisionCode, leagueId);

    if (!dryRun && providerId) {
      await upsertLeagueMapping(prisma, providerId, leagueId, divisionCode, division);
    }
  }

  return leagueIdByCode;
}

async function ensureSeasons(
  prisma: PrismaClient,
  leagueIdByCode: Map<string, string>,
  seasonSeeds: Map<string, SeasonSeed>,
  dryRun: boolean,
  dbAvailable: boolean,
  summary: ImportSummary,
): Promise<Map<string, string>> {
  const seasonIdByKey = new Map<string, string>();

  for (const [seasonKey, seasonSeed] of seasonSeeds.entries()) {
    const leagueId = leagueIdByCode.get(seasonSeed.divisionCode);
    if (!leagueId) {
      continue;
    }

    if (dryRun) {
      if (!dbAvailable) {
        seasonIdByKey.set(seasonKey, `dry-run:${seasonKey}`);
        continue;
      }
      const existing = await prisma.season.findUnique({
        where: {
          leagueId_seasonYear: {
            leagueId,
            seasonYear: seasonSeed.seasonYear,
          },
        },
        select: { id: true },
      });
      seasonIdByKey.set(seasonKey, existing?.id ?? `dry-run:${seasonKey}`);
      continue;
    }

    const season = await prisma.season.upsert({
      where: {
        leagueId_seasonYear: {
          leagueId,
          seasonYear: seasonSeed.seasonYear,
        },
      },
      create: {
        leagueId,
        seasonYear: seasonSeed.seasonYear,
        name: seasonSeed.seasonName,
        startDate: seasonSeed.startDate,
        endDate: seasonSeed.endDate,
        isCurrent: false,
      },
      update: {
        name: seasonSeed.seasonName,
        startDate: seasonSeed.startDate,
        endDate: seasonSeed.endDate,
      },
    });

    seasonIdByKey.set(seasonKey, season.id);
    summary.seasonsUpserted += 1;
  }

  return seasonIdByKey;
}

async function ensureTeams(
  prisma: PrismaClient,
  sportId: string | null,
  teamSeeds: Map<string, TeamSeed>,
  dryRun: boolean,
  dbAvailable: boolean,
  summary: ImportSummary,
): Promise<Map<string, string>> {
  const teamIdByKey = new Map<string, string>();
  if (!sportId) {
    if (dryRun) {
      for (const teamSeed of teamSeeds.values()) {
        const deterministicId = buildDeterministicId('archive_team', teamSeed.canonicalExternalId);
        teamIdByKey.set(teamSeed.teamKey, deterministicId);
        summary.newTeamsCreated += 1;
      }
    }
    return teamIdByKey;
  }

  if (dryRun && !dbAvailable) {
    for (const teamSeed of teamSeeds.values()) {
      const deterministicId = buildDeterministicId('archive_team', teamSeed.canonicalExternalId);
      teamIdByKey.set(teamSeed.teamKey, deterministicId);
      summary.newTeamsCreated += 1;
    }
    return teamIdByKey;
  }

  const existingTeams = await prisma.team.findMany({
    where: {
      deletedAt: null,
      sportId,
    },
    select: {
      id: true,
      name: true,
      country: true,
      slug: true,
    },
  });

  const existingByLookupKey = new Map<string, { id: string; slug: string }>();
  const usedSlugs = new Set(existingTeams.map((item) => item.slug));
  for (const team of existingTeams) {
    existingByLookupKey.set(buildInternalLookupKey(team.country ?? '', team.name), {
      id: team.id,
      slug: team.slug,
    });
  }

  const orderedTeamSeeds = [...teamSeeds.values()].sort((a, b) => a.teamKey.localeCompare(b.teamKey));

  for (const teamSeed of orderedTeamSeeds) {
    const existing = existingByLookupKey.get(teamSeed.internalLookupKey);
    if (existing) {
      teamIdByKey.set(teamSeed.teamKey, existing.id);
      summary.teamsResolved += 1;
      continue;
    }

    const deterministicId = buildDeterministicId('archive_team', teamSeed.canonicalExternalId);
    if (dryRun) {
      teamIdByKey.set(teamSeed.teamKey, deterministicId);
      summary.newTeamsCreated += 1;
      continue;
    }

    const slug = ensureUniqueSlug(
      usedSlugs,
      slugify(`${teamSeed.countryName}-${teamSeed.name}`),
    );

    const team = await prisma.team.upsert({
      where: { id: deterministicId },
      create: {
        id: deterministicId,
        sportId,
        name: teamSeed.name,
        slug,
        country: teamSeed.countryName,
      },
      update: {
        sportId,
        name: teamSeed.name,
        country: teamSeed.countryName,
      },
    });

    usedSlugs.add(team.slug);
    teamIdByKey.set(teamSeed.teamKey, team.id);
    summary.newTeamsCreated += 1;
  }

  return teamIdByKey;
}

async function ensureTeamMappings(
  prisma: PrismaClient,
  providerId: string | null,
  teamSeeds: Map<string, TeamSeed>,
  teamIdByKey: Map<string, string>,
  dryRun: boolean,
) {
  if (!providerId || dryRun) {
    return;
  }

  for (const teamSeed of teamSeeds.values()) {
    const teamId = teamIdByKey.get(teamSeed.teamKey);
    if (!teamId) {
      continue;
    }

    const existingByTeam = await prisma.providerTeamMapping.findUnique({
      where: {
        providerId_teamId: {
          providerId,
          teamId,
        },
      },
      select: { id: true },
    });

    if (existingByTeam) {
      continue;
    }

    await prisma.providerTeamMapping.upsert({
      where: {
        providerId_externalId: {
          providerId,
          externalId: teamSeed.canonicalExternalId,
        },
      },
      create: {
        providerId,
        teamId,
        externalId: teamSeed.canonicalExternalId,
        externalName: teamSeed.name,
        confidence: 1,
        reviewNeeded: false,
        rawPayload: {
          source: 'club-football-archive',
          countryCode: teamSeed.countryCode,
        } satisfies Prisma.InputJsonValue,
      },
      update: {
        teamId,
        externalName: teamSeed.name,
        confidence: 1,
        reviewNeeded: false,
        reviewReason: null,
        rawPayload: {
          source: 'club-football-archive',
          countryCode: teamSeed.countryCode,
        } satisfies Prisma.InputJsonValue,
      },
    });
  }
}

async function ensureTeamAliases(
  prisma: PrismaClient,
  providerId: string | null,
  aliasSeeds: Map<string, AliasSeed>,
  teamIdByKey: Map<string, string>,
  dryRun: boolean,
  summary: ImportSummary,
) {
  if (!providerId || dryRun) {
    return;
  }

  for (const aliasSeed of aliasSeeds.values()) {
    const teamId = aliasSeed.teamKey ? teamIdByKey.get(aliasSeed.teamKey) ?? null : null;
    await prisma.providerTeamAlias.upsert({
      where: {
        providerId_externalAlias: {
          providerId,
          externalAlias: aliasSeed.externalAlias,
        },
      },
      create: {
        providerId,
        teamId,
        externalAlias: aliasSeed.externalAlias,
        externalName: aliasSeed.externalName,
        countryCode: aliasSeed.countryCode,
        confidence: aliasSeed.confidence,
        rawPayload: aliasSeed.rawPayload as Prisma.InputJsonValue,
      },
      update: {
        teamId,
        externalName: aliasSeed.externalName,
        countryCode: aliasSeed.countryCode,
        confidence: aliasSeed.confidence,
        rawPayload: aliasSeed.rawPayload as Prisma.InputJsonValue,
      },
    });
    summary.aliasesUpserted += 1;
  }
}

async function importMatches(input: {
  prisma: PrismaClient;
  options: ImportOptions;
  providerId: string;
  sportId: string;
  leagueIdByCode: Map<string, string>;
  seasonIdByKey: Map<string, string>;
  teamIdByKey: Map<string, string>;
  summary: ImportSummary;
}) {
  const { prisma, options, providerId, sportId, leagueIdByCode, seasonIdByKey, teamIdByKey, summary } = input;
  const matchRows: MatchBatchRow[] = [];

  const flushBatch = async () => {
    if (matchRows.length === 0) {
      return;
    }

    const matchesPayload: Prisma.MatchCreateManyInput[] = [];
    const mappingsPayload: Prisma.ProviderMatchMappingCreateManyInput[] = [];
    const teamStatsPayload: Prisma.TeamStatCreateManyInput[] = [];

    for (const item of matchRows) {
      matchesPayload.push({
        id: item.id,
        sportId: item.sportId,
        leagueId: item.leagueId,
        seasonId: item.seasonId,
        homeTeamId: item.homeTeamId,
        awayTeamId: item.awayTeamId,
        matchDate: item.matchDate,
        status: item.status,
        homeScore: item.homeScore,
        awayScore: item.awayScore,
        timezone: 'UTC',
      });

      mappingsPayload.push({
        providerId,
        matchId: item.id,
        externalId: buildMatchExternalId(item.rawRow),
        externalRef: item.rawRow.Division,
        confidence: 1,
        reviewNeeded: false,
        rawPayload: item.rawRow as unknown as Prisma.InputJsonValue,
      });

      const homeStat = buildTeamStatRow(item.id, item.homeTeamId, item.rawRow, 'home');
      const awayStat = buildTeamStatRow(item.id, item.awayTeamId, item.rawRow, 'away');
      if (homeStat) {
        teamStatsPayload.push(homeStat);
      }
      if (awayStat) {
        teamStatsPayload.push(awayStat);
      }
    }

    const [matchesResult, mappingsResult, teamStatsResult] = await prisma.$transaction([
      prisma.match.createMany({ data: matchesPayload, skipDuplicates: true }),
      prisma.providerMatchMapping.createMany({ data: mappingsPayload, skipDuplicates: true }),
      prisma.teamStat.createMany({ data: teamStatsPayload, skipDuplicates: true }),
    ]);

    summary.matchesInserted += matchesResult.count;
    summary.matchMappingsInserted += mappingsResult.count;
    summary.teamStatsInserted += teamStatsResult.count;
    matchRows.length = 0;
  };

  await scanMatches({
    matchesPath: options.matchesPath,
    limit: options.limit,
    selectedDivisions: options.divisions,
    onRow: (row) => {
      const division = ARCHIVE_DIVISION_MAP.get(row.Division);
      if (!division) {
        return;
      }

      const matchDate = parseArchiveDate(row.MatchDate, row.MatchTime);
      if (!matchDate) {
        return;
      }

      const leagueId = leagueIdByCode.get(division.code);
      const seasonId = seasonIdByKey.get(`${division.code}:${resolveSeasonYear(division, matchDate)}`);
      const homeTeamId = teamIdByKey.get(resolveTeamSeedKey(division.countryCode, row.HomeTeam));
      const awayTeamId = teamIdByKey.get(resolveTeamSeedKey(division.countryCode, row.AwayTeam));

      if (!leagueId || !seasonId || !homeTeamId || !awayTeamId) {
        summary.skippedInvalidRows += 1;
        return;
      }

      matchRows.push({
        id: buildDeterministicId('archive_match', buildMatchExternalId(row)),
        sportId,
        leagueId,
        seasonId,
        homeTeamId,
        awayTeamId,
        matchDate,
        status: resolveMatchStatus(row),
        homeScore: parseInteger(row.FTHome),
        awayScore: parseInteger(row.FTAway),
        rawRow: row,
      });
      summary.matchesQueued += 1;
    },
    summary,
    logEvery: options.logEvery,
    onBatchBoundary: async () => {
      if (matchRows.length >= options.batchSize) {
        await flushBatch();
      }
    },
  });

  await flushBatch();
}

async function importElo(input: {
  prisma: PrismaClient;
  eloPath: string;
  limit: number | null;
  providerId: string;
  teamIdByKey: Map<string, string>;
  summary: ImportSummary;
  logEvery: number;
}) {
  const { prisma, eloPath, limit, providerId, teamIdByKey, summary, logEvery } = input;
  const snapshotsBatch: Prisma.TeamRatingSnapshotCreateManyInput[] = [];

  const flushBatch = async () => {
    if (snapshotsBatch.length === 0) {
      return;
    }
    const result = await prisma.teamRatingSnapshot.createMany({
      data: snapshotsBatch,
      skipDuplicates: true,
    });
    summary.eloInserted += result.count;
    snapshotsBatch.length = 0;
  };

  let scanned = 0;
  for await (const row of readCsvFile(eloPath)) {
    scanned += 1;
    summary.eloScanned += 1;
    if (limit && scanned > limit) {
      break;
    }

    const snapshotDate = parseIsoDate(row.date);
    const countryCode = normalizeCountryCode(row.country);
    const clubName = (row.club || '').trim();
    const ratingValue = parseFloatValue(row.elo);
    if (!snapshotDate || !countryCode || !clubName || ratingValue === null) {
      summary.skippedInvalidRows += 1;
      continue;
    }

    const teamKey = resolveTeamSeedKey(countryCode, clubName);
    snapshotsBatch.push({
      providerId,
      teamId: teamIdByKey.get(teamKey) ?? null,
      snapshotDate,
      ratingType: ARCHIVE_RATING_TYPE,
      ratingValue,
      externalTeamRef: buildAliasExternalKey(countryCode, clubName),
      countryCode,
      rawPayload: row as unknown as Prisma.InputJsonValue,
    });

    if (snapshotsBatch.length >= DEFAULT_BATCH_SIZE) {
      await flushBatch();
    }

    if (scanned % logEvery === 0) {
      logger.log(`Elo import progress scanned=${scanned} inserted=${summary.eloInserted}`);
    }
  }

  await flushBatch();
}

async function scanMatches(input: {
  matchesPath: string;
  limit: number | null;
  selectedDivisions: Set<string> | null;
  onRow: (row: CsvRecord) => void;
  summary: ImportSummary;
  logEvery: number;
  onBatchBoundary?: () => Promise<void>;
}) {
  const { matchesPath, limit, selectedDivisions, onRow, summary, logEvery, onBatchBoundary } = input;
  let processed = 0;

  for await (const row of readCsvFile(matchesPath)) {
    processed += 1;
    summary.matchesScanned += 1;
    if (limit && processed > limit) {
      break;
    }

    const division = (row.Division || '').trim();
    if (!division) {
      summary.skippedInvalidRows += 1;
      continue;
    }
    if (selectedDivisions && !selectedDivisions.has(division)) {
      continue;
    }

    onRow(row);
    if (onBatchBoundary) {
      await onBatchBoundary();
    }
    if (processed % logEvery === 0) {
      logger.log(`Match scan progress scanned=${processed}`);
    }
  }
}

async function scanElo(input: {
  eloPath: string;
  limit: number | null;
  onRow: (row: CsvRecord) => void;
  summary: ImportSummary;
  logEvery: number;
}) {
  const { eloPath, limit, onRow, summary, logEvery } = input;
  let processed = 0;

  for await (const row of readCsvFile(eloPath)) {
    processed += 1;
    summary.eloScanned += 1;
    if (limit && processed > limit) {
      break;
    }

    onRow(row);
    if (processed % logEvery === 0) {
      logger.log(`Elo scan progress scanned=${processed}`);
    }
  }
}

async function* readCsvFile(filePath: string): AsyncGenerator<CsvRecord> {
  const input = await openCsvStream(filePath);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let headers: string[] | null = null;
  for await (const line of rl) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    if (!line.trim()) {
      continue;
    }

    const values = parseCsvLine(line);
    const record: CsvRecord = {};
    for (let index = 0; index < headers.length; index += 1) {
      record[headers[index]] = values[index] ?? '';
    }
    yield record;
  }
}

async function openCsvStream(filePath: string): Promise<NodeJS.ReadableStream> {
  if (isRemoteSource(filePath)) {
    const response = await fetch(filePath);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch CSV source ${filePath} status=${response.status}`);
    }

    const input = Readable.fromWeb(response.body as never);
    input.setEncoding('utf8');
    return input;
  }

  return fs.createReadStream(filePath, { encoding: 'utf8' });
}

async function canReachDatabase(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$connect();
    return true;
  } catch {
    return false;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect failures in dry-run connectivity checks.
    }
  }
}

function parseArgs(args: string[]): ImportOptions {
  let matchesPath = DEFAULT_MATCHES_PATH;
  let eloPath: string | null = DEFAULT_ELO_PATH;
  let dryRun = false;
  let teamsOnly = false;
  let limit: number | null = null;
  let divisions: Set<string> | null = null;
  let logEvery = DEFAULT_LOG_EVERY;
  let batchSize = DEFAULT_BATCH_SIZE;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--teams-only') {
      teamsOnly = true;
      continue;
    }
    if (arg === '--skip-elo') {
      eloPath = null;
      continue;
    }
    if (arg.startsWith('--matches=')) {
      matchesPath = resolveInputSource(arg.slice('--matches='.length));
      continue;
    }
    if (arg.startsWith('--elo=')) {
      eloPath = resolveInputSource(arg.slice('--elo='.length));
      continue;
    }
    if (arg.startsWith('--limit=')) {
      limit = Number(arg.slice('--limit='.length));
      continue;
    }
    if (arg.startsWith('--divisions=')) {
      const parsed = arg
        .slice('--divisions='.length)
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);
      divisions = new Set(parsed);
      continue;
    }
    if (arg.startsWith('--log-every=')) {
      logEvery = Number(arg.slice('--log-every='.length)) || DEFAULT_LOG_EVERY;
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      batchSize = Number(arg.slice('--batch-size='.length)) || DEFAULT_BATCH_SIZE;
      continue;
    }
  }

  return {
    matchesPath,
    eloPath,
    dryRun,
    teamsOnly,
    limit: limit && limit > 0 ? limit : null,
    divisions,
    logEvery,
    batchSize,
  };
}

function registerTeamAndAlias(
  teamSeeds: Map<string, TeamSeed>,
  aliasSeeds: Map<string, AliasSeed>,
  division: ArchiveDivisionConfig,
  rawTeamName: string,
  source: 'matches' | 'elo',
) {
  const teamName = (rawTeamName || '').trim();
  if (!teamName) {
    return;
  }

  const canonicalTeamName = resolveCanonicalTeamName(division.countryCode, teamName);
  const teamKey = buildTeamCanonicalKey(division.countryCode, canonicalTeamName);
  if (!teamSeeds.has(teamKey)) {
    teamSeeds.set(teamKey, {
      teamKey,
      canonicalExternalId: buildCanonicalExternalTeamId(division.countryCode, canonicalTeamName),
      name: canonicalTeamName,
      countryCode: division.countryCode,
      countryName: division.countryName,
      internalLookupKey: buildInternalLookupKey(division.countryName, canonicalTeamName),
    });
  }

  const aliasKey = buildAliasExternalKey(division.countryCode, teamName);
  if (!aliasSeeds.has(aliasKey)) {
    aliasSeeds.set(aliasKey, {
      externalAlias: aliasKey,
      teamKey,
      externalName: teamName,
      countryCode: division.countryCode,
      confidence: 1,
      rawPayload: {
        source,
        countryCode: division.countryCode,
        teamName,
        canonicalTeamName,
      },
    });
  }
}

function buildTeamStatRow(
  matchId: string,
  teamId: string,
  row: CsvRecord,
  side: 'home' | 'away',
): Prisma.TeamStatCreateManyInput | null {
  const shots = parseInteger(side === 'home' ? row.HomeShots : row.AwayShots);
  const shotsOnTarget = parseInteger(side === 'home' ? row.HomeTarget : row.AwayTarget);
  const corners = parseInteger(side === 'home' ? row.HomeCorners : row.AwayCorners);
  const fouls = parseInteger(side === 'home' ? row.HomeFouls : row.AwayFouls);
  const yellowCards = parseInteger(side === 'home' ? row.HomeYellow : row.AwayYellow);
  const redCards = parseInteger(side === 'home' ? row.HomeRed : row.AwayRed);

  if (
    shots === null &&
    shotsOnTarget === null &&
    corners === null &&
    fouls === null &&
    yellowCards === null &&
    redCards === null
  ) {
    return null;
  }

  return {
    matchId,
    teamId,
    shots,
    shotsOnTarget,
    corners,
    fouls,
    payload: {
      yellowCards,
      redCards,
    } satisfies Prisma.InputJsonValue,
  };
}

async function upsertLeagueMapping(
  prisma: PrismaClient,
  providerId: string,
  leagueId: string,
  externalId: string,
  division: ArchiveDivisionConfig,
) {
  const existingByLeague = await prisma.providerLeagueMapping.findUnique({
    where: {
      providerId_leagueId: {
        providerId,
        leagueId,
      },
    },
    select: { id: true },
  });

  if (existingByLeague) {
    return;
  }

  await prisma.providerLeagueMapping.upsert({
    where: {
      providerId_externalId: {
        providerId,
        externalId,
      },
    },
    create: {
      providerId,
      leagueId,
      externalId,
      externalName: division.leagueName,
      confidence: 1,
      reviewNeeded: false,
      rawPayload: {
        countryCode: division.countryCode,
        tier: division.tier,
      } satisfies Prisma.InputJsonValue,
    },
    update: {
      leagueId,
      externalName: division.leagueName,
      confidence: 1,
      reviewNeeded: false,
      reviewReason: null,
      rawPayload: {
        countryCode: division.countryCode,
        tier: division.tier,
      } satisfies Prisma.InputJsonValue,
    },
  });
}

function buildCanonicalExternalTeamId(countryCode: string, teamName: string): string {
  return `team:${countryCode}:${normalizeToken(teamName)}`;
}

function buildAliasExternalKey(countryCode: string, teamName: string): string {
  return `alias:${countryCode}:${normalizeToken(teamName)}`;
}

function buildTeamCanonicalKey(countryCode: string, teamName: string): string {
  return `${countryCode}:${normalizeToken(teamName)}`;
}

function buildLeagueLookupKey(countryName: string, leagueName: string): string {
  return `${normalizeToken(countryName)}:${normalizeToken(leagueName)}`;
}

function buildInternalLookupKey(countryName: string, teamName: string): string {
  return `${normalizeToken(countryName)}:${normalizeToken(teamName)}`;
}

function resolveCanonicalTeamName(countryCode: string, rawTeamName: string): string {
  const teamName = (rawTeamName || '').trim();
  if (!teamName) {
    return '';
  }

  const override = ARCHIVE_TEAM_ALIAS_OVERRIDE_MAP.get(
    `${countryCode}:${teamName.toLowerCase()}`,
  );

  return override?.canonicalName ?? teamName;
}

function resolveTeamSeedKey(countryCode: string, rawTeamName: string): string {
  return buildTeamCanonicalKey(
    countryCode,
    resolveCanonicalTeamName(countryCode, rawTeamName),
  );
}

function buildMatchExternalId(row: CsvRecord): string {
  const date = parseArchiveDate(row.MatchDate, row.MatchTime);
  const timestamp = date ? date.toISOString() : `${row.MatchDate} ${row.MatchTime}`;
  return `match:${row.Division}:${timestamp}:${normalizeToken(row.HomeTeam)}:${normalizeToken(row.AwayTeam)}`;
}

function buildDeterministicId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha1').update(value).digest('hex').slice(0, 24)}`;
}

function ensureUniqueSlug(usedSlugs: Set<string>, base: string): string {
  const fallbackBase = base || 'archive-item';
  let slug = fallbackBase;
  let attempt = 1;
  while (usedSlugs.has(slug)) {
    attempt += 1;
    slug = `${fallbackBase}-${attempt}`;
  }
  return slug;
}

function resolveSeasonYear(config: ArchiveDivisionConfig, matchDate: Date): number {
  if (config.calendarSeason) {
    return matchDate.getUTCFullYear();
  }
  return matchDate.getUTCMonth() >= 6
    ? matchDate.getUTCFullYear()
    : matchDate.getUTCFullYear() - 1;
}

function formatSeasonName(config: ArchiveDivisionConfig, seasonYear: number): string {
  if (config.calendarSeason) {
    return String(seasonYear);
  }
  return `${seasonYear}/${String(seasonYear + 1).slice(-2)}`;
}

function resolveMatchStatus(row: CsvRecord): MatchStatus {
  const homeScore = parseInteger(row.FTHome);
  const awayScore = parseInteger(row.FTAway);
  if (homeScore !== null && awayScore !== null) {
    return MatchStatus.COMPLETED;
  }
  return MatchStatus.SCHEDULED;
}

function parseArchiveDate(dateValue: string, timeValue: string): Date | null {
  const rawDate = (dateValue || '').trim();
  if (!rawDate) {
    return null;
  }

  const [dayRaw, monthRaw, yearRaw] = rawDate.split(/[./-]/);
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  if (!day || !month || !year) {
    return null;
  }

  const [hoursRaw, minutesRaw] = ((timeValue || '').trim() || '12:00').split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

function parseIsoDate(value: string): Date | null {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseInteger(value: string): number | null {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function parseFloatValue(value: string): number | null {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCountryCode(value: string): string {
  return (value || '').trim().toUpperCase();
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function slugify(value: string): string {
  return normalizeToken(value);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function ensureFileExists(filePath: string, label: string) {
  if (isRemoteSource(filePath)) {
    return;
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at ${filePath}`);
  }
}

function isRemoteSource(filePath: string): boolean {
  return /^https?:\/\//i.test(filePath);
}

function resolveInputSource(value: string): string {
  return isRemoteSource(value) ? value : path.resolve(value);
}

void main();
