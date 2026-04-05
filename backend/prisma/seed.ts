import { IngestionStatus, MatchStatus, PredictionStatus, PrismaClient, SportCode } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const [adminRole, analystRole, userRole] = await Promise.all([
    prisma.role.upsert({ where: { name: 'admin' }, create: { name: 'admin', description: 'Platform administrator' }, update: {} }),
    prisma.role.upsert({ where: { name: 'analyst' }, create: { name: 'analyst', description: 'Data analyst' }, update: {} }),
    prisma.role.upsert({ where: { name: 'user' }, create: { name: 'user', description: 'Regular user' }, update: {} }),
  ]);

  const [football, basketball] = await Promise.all([
    prisma.sport.upsert({
      where: { code: SportCode.FOOTBALL },
      create: { code: SportCode.FOOTBALL, name: 'Football', isActive: true },
      update: { name: 'Football', isActive: true },
    }),
    prisma.sport.upsert({
      where: { code: SportCode.BASKETBALL },
      create: { code: SportCode.BASKETBALL, name: 'Basketball', isActive: true },
      update: { name: 'Basketball', isActive: true },
    }),
  ]);

  const providers = await Promise.all([
    prisma.provider.upsert({
      where: { code: 'football_data' },
      create: {
        code: 'football_data',
        name: 'Football Data',
        baseUrl: process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
        isActive: true,
      },
      update: {
        baseUrl: process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
        isActive: true,
      },
    }),
    prisma.provider.upsert({
      where: { code: 'ball_dont_lie' },
      create: {
        code: 'ball_dont_lie',
        name: 'Ball Dont Lie',
        baseUrl: process.env.BALL_DONT_LIE_BASE_URL || 'https://api.balldontlie.io/v1',
        isActive: true,
      },
      update: {
        baseUrl: process.env.BALL_DONT_LIE_BASE_URL || 'https://api.balldontlie.io/v1',
        isActive: true,
      },
    }),
    prisma.provider.upsert({
      where: { code: 'api_football' },
      create: {
        code: 'api_football',
        name: 'API Football',
        baseUrl: process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
        isActive: false,
      },
      update: {
        baseUrl: process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
        isActive: false,
      },
    }),
    prisma.provider.upsert({
      where: { code: 'the_sports_db' },
      create: {
        code: 'the_sports_db',
        name: 'The Sports DB',
        baseUrl: process.env.THE_SPORTS_DB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/3',
        isActive: false,
      },
      update: {
        baseUrl: process.env.THE_SPORTS_DB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/3',
        isActive: false,
      },
    }),
  ]);

  await upsertProviderConfig(providers.find((item) => item.code === 'football_data')!.id, 'enabled', 'true');
  await upsertProviderConfig(providers.find((item) => item.code === 'football_data')!.id, 'apiKey', process.env.FOOTBALL_DATA_API_KEY || 'change_me');

  await upsertProviderConfig(providers.find((item) => item.code === 'ball_dont_lie')!.id, 'enabled', 'true');
  await upsertProviderConfig(providers.find((item) => item.code === 'ball_dont_lie')!.id, 'apiKey', process.env.BALL_DONT_LIE_API_KEY || 'change_me');

  await upsertProviderConfig(providers.find((item) => item.code === 'api_football')!.id, 'enabled', 'false');
  await upsertProviderConfig(providers.find((item) => item.code === 'api_football')!.id, 'apiKey', process.env.API_FOOTBALL_API_KEY || 'change_me');

  await upsertProviderConfig(providers.find((item) => item.code === 'the_sports_db')!.id, 'enabled', 'false');
  await upsertProviderConfig(providers.find((item) => item.code === 'the_sports_db')!.id, 'apiKey', process.env.THE_SPORTS_DB_API_KEY || 'change_me');

  const adminHash = await argon2.hash('Admin123!');
  const analystHash = await argon2.hash('Analyst123!');
  const userHash = await argon2.hash('User123!');

  await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@tahminx.local' },
      create: {
        email: 'admin@tahminx.local',
        username: 'admin',
        fullName: 'System Admin',
        passwordHash: adminHash,
        roleId: adminRole.id,
      },
      update: { passwordHash: adminHash, roleId: adminRole.id, isActive: true },
    }),
    prisma.user.upsert({
      where: { email: 'analyst@tahminx.local' },
      create: {
        email: 'analyst@tahminx.local',
        username: 'analyst',
        fullName: 'Data Analyst',
        passwordHash: analystHash,
        roleId: analystRole.id,
      },
      update: { passwordHash: analystHash, roleId: analystRole.id, isActive: true },
    }),
    prisma.user.upsert({
      where: { email: 'user@tahminx.local' },
      create: {
        email: 'user@tahminx.local',
        username: 'user',
        fullName: 'Default User',
        passwordHash: userHash,
        roleId: userRole.id,
      },
      update: { passwordHash: userHash, roleId: userRole.id, isActive: true },
    }),
  ]);

  const premierLeague = await prisma.league.upsert({
    where: { slug: 'england-premier-league' },
    create: {
      sportId: football.id,
      name: 'England Premier League',
      slug: 'england-premier-league',
      country: 'England',
      isActive: true,
    },
    update: { name: 'England Premier League', country: 'England', isActive: true },
  });

  const superLig = await prisma.league.upsert({
    where: { slug: 'turkey-super-lig' },
    create: {
      sportId: football.id,
      name: 'Turkey Super Lig',
      slug: 'turkey-super-lig',
      country: 'Turkey',
      isActive: true,
    },
    update: { name: 'Turkey Super Lig', country: 'Turkey', isActive: true },
  });

  const nba = await prisma.league.upsert({
    where: { slug: 'nba' },
    create: {
      sportId: basketball.id,
      name: 'NBA',
      slug: 'nba',
      country: 'USA',
      isActive: true,
    },
    update: { name: 'NBA', country: 'USA', isActive: true },
  });

  const currentYear = new Date().getUTCFullYear();

  const [seasonPremier, seasonSuperLig, seasonNba] = await Promise.all([
    prisma.season.upsert({
      where: { leagueId_seasonYear: { leagueId: premierLeague.id, seasonYear: currentYear } },
      create: {
        leagueId: premierLeague.id,
        seasonYear: currentYear,
        name: `${currentYear}/${String(currentYear + 1).slice(-2)}`,
        isCurrent: true,
      },
      update: { isCurrent: true },
    }),
    prisma.season.upsert({
      where: { leagueId_seasonYear: { leagueId: superLig.id, seasonYear: currentYear } },
      create: {
        leagueId: superLig.id,
        seasonYear: currentYear,
        name: `${currentYear}/${String(currentYear + 1).slice(-2)}`,
        isCurrent: true,
      },
      update: { isCurrent: true },
    }),
    prisma.season.upsert({
      where: { leagueId_seasonYear: { leagueId: nba.id, seasonYear: currentYear } },
      create: {
        leagueId: nba.id,
        seasonYear: currentYear,
        name: `${currentYear}`,
        isCurrent: true,
      },
      update: { isCurrent: true },
    }),
  ]);

  const [arsenal, chelsea, galatasaray, fenerbahce, lakers, celtics] = await Promise.all([
    upsertTeam('arsenal', football.id, 'Arsenal', 'ARS', 'England', 'Emirates Stadium', 'https://example.com/arsenal.png'),
    upsertTeam('chelsea', football.id, 'Chelsea', 'CHE', 'England', 'Stamford Bridge', 'https://example.com/chelsea.png'),
    upsertTeam('galatasaray', football.id, 'Galatasaray', 'GS', 'Turkey', 'RAMS Park', 'https://example.com/galatasaray.png'),
    upsertTeam('fenerbahce', football.id, 'Fenerbahce', 'FB', 'Turkey', 'Ulker Stadium', 'https://example.com/fenerbahce.png'),
    upsertTeam('la-lakers', basketball.id, 'LA Lakers', 'LAL', 'USA', 'Crypto.com Arena', 'https://example.com/lakers.png'),
    upsertTeam('boston-celtics', basketball.id, 'Boston Celtics', 'BOS', 'USA', 'TD Garden', 'https://example.com/celtics.png'),
  ]);

  await Promise.all([
    upsertPlayer('seed-arsenal-saka', arsenal.id, 'Bukayo Saka', 'RW', 'England'),
    upsertPlayer('seed-chelsea-palmer', chelsea.id, 'Cole Palmer', 'AM', 'England'),
    upsertPlayer('seed-gala-icardi', galatasaray.id, 'Mauro Icardi', 'ST', 'Argentina'),
    upsertPlayer('seed-fb-dzeko', fenerbahce.id, 'Edin Dzeko', 'ST', 'Bosnia'),
    upsertPlayer('seed-lakers-lebron', lakers.id, 'LeBron James', 'SF', 'USA'),
    upsertPlayer('seed-celtics-tatum', celtics.id, 'Jayson Tatum', 'SF', 'USA'),
  ]);

  const now = Date.now();
  const [footballUpcoming, _superLigUpcoming, nbaUpcoming] = await Promise.all([
    prisma.match.upsert({
      where: { id: 'seed-match-epl-1' },
      create: {
        id: 'seed-match-epl-1',
        sportId: football.id,
        leagueId: premierLeague.id,
        seasonId: seasonPremier.id,
        homeTeamId: arsenal.id,
        awayTeamId: chelsea.id,
        matchDate: new Date(now + 24 * 60 * 60 * 1000),
        status: MatchStatus.SCHEDULED,
        venue: 'Emirates Stadium',
      },
      update: {
        sportId: football.id,
        leagueId: premierLeague.id,
        seasonId: seasonPremier.id,
        homeTeamId: arsenal.id,
        awayTeamId: chelsea.id,
        matchDate: new Date(now + 24 * 60 * 60 * 1000),
        status: MatchStatus.SCHEDULED,
        venue: 'Emirates Stadium',
      },
    }),
    prisma.match.upsert({
      where: { id: 'seed-match-slg-1' },
      create: {
        id: 'seed-match-slg-1',
        sportId: football.id,
        leagueId: superLig.id,
        seasonId: seasonSuperLig.id,
        homeTeamId: galatasaray.id,
        awayTeamId: fenerbahce.id,
        matchDate: new Date(now + 30 * 60 * 60 * 1000),
        status: MatchStatus.SCHEDULED,
        venue: 'RAMS Park',
      },
      update: {
        sportId: football.id,
        leagueId: superLig.id,
        seasonId: seasonSuperLig.id,
        homeTeamId: galatasaray.id,
        awayTeamId: fenerbahce.id,
        matchDate: new Date(now + 30 * 60 * 60 * 1000),
        status: MatchStatus.SCHEDULED,
        venue: 'RAMS Park',
      },
    }),
    prisma.match.upsert({
      where: { id: 'seed-match-nba-1' },
      create: {
        id: 'seed-match-nba-1',
        sportId: basketball.id,
        leagueId: nba.id,
        seasonId: seasonNba.id,
        homeTeamId: lakers.id,
        awayTeamId: celtics.id,
        matchDate: new Date(now + 12 * 60 * 60 * 1000),
        status: MatchStatus.SCHEDULED,
        venue: 'Crypto.com Arena',
      },
      update: {
        sportId: basketball.id,
        leagueId: nba.id,
        seasonId: seasonNba.id,
        homeTeamId: lakers.id,
        awayTeamId: celtics.id,
        matchDate: new Date(now + 12 * 60 * 60 * 1000),
        status: MatchStatus.SCHEDULED,
        venue: 'Crypto.com Arena',
      },
    }),
  ]);

  const [footballModel, basketballModel] = await Promise.all([
    prisma.modelVersion.upsert({
      where: { key: 'football-hybrid-v1' },
      create: {
        sportId: football.id,
        key: 'football-hybrid-v1',
        name: 'Football Hybrid Model',
        version: '1.0.0',
        status: 'active',
        metadata: { family: 'elo-poisson' },
      },
      update: { status: 'active', sportId: football.id },
    }),
    prisma.modelVersion.upsert({
      where: { key: 'basketball-hybrid-v1' },
      create: {
        sportId: basketball.id,
        key: 'basketball-hybrid-v1',
        name: 'Basketball Hybrid Model',
        version: '1.0.0',
        status: 'active',
        metadata: { family: 'rating-pace' },
      },
      update: { status: 'active', sportId: basketball.id },
    }),
  ]);

  const footballPrediction = await prisma.prediction.upsert({
    where: { matchId_modelVersionId: { matchId: footballUpcoming.id, modelVersionId: footballModel.id } },
    create: {
      matchId: footballUpcoming.id,
      modelVersionId: footballModel.id,
      status: PredictionStatus.PUBLISHED,
      probabilities: { homeWin: 0.52, draw: 0.24, awayWin: 0.24 },
      expectedScore: { home: 1.8, away: 1.1 },
      confidenceScore: 78,
      summary: 'Home form and venue edge keep home side ahead.',
      riskFlags: ['Missing player uncertainty', 'Low data confidence'],
    },
    update: {
      probabilities: { homeWin: 0.52, draw: 0.24, awayWin: 0.24 },
      expectedScore: { home: 1.8, away: 1.1 },
      confidenceScore: 78,
      summary: 'Home form and venue edge keep home side ahead.',
      riskFlags: ['Missing player uncertainty', 'Low data confidence'],
    },
  });

  const basketballPrediction = await prisma.prediction.upsert({
    where: { matchId_modelVersionId: { matchId: nbaUpcoming.id, modelVersionId: basketballModel.id } },
    create: {
      matchId: nbaUpcoming.id,
      modelVersionId: basketballModel.id,
      status: PredictionStatus.PUBLISHED,
      probabilities: { homeWin: 0.56, draw: 0, awayWin: 0.44 },
      expectedScore: { home: 111.2, away: 106.8 },
      confidenceScore: 74,
      summary: 'Pace and efficiency signals support the home side.',
      riskFlags: ['Back-to-back effect'],
    },
    update: {
      probabilities: { homeWin: 0.56, draw: 0, awayWin: 0.44 },
      expectedScore: { home: 111.2, away: 106.8 },
      confidenceScore: 74,
      summary: 'Pace and efficiency signals support the home side.',
      riskFlags: ['Back-to-back effect'],
    },
  });

  await Promise.all([
    prisma.predictionExplanation.upsert({
      where: { predictionId: footballPrediction.id },
      create: {
        predictionId: footballPrediction.id,
        explanation: { featureHighlights: ['recentFormScore', 'homeAwayStrength'] },
      },
      update: {
        explanation: { featureHighlights: ['recentFormScore', 'homeAwayStrength'] },
      },
    }),
    prisma.predictionExplanation.upsert({
      where: { predictionId: basketballPrediction.id },
      create: {
        predictionId: basketballPrediction.id,
        explanation: { featureHighlights: ['offensiveRating', 'pace'] },
      },
      update: {
        explanation: { featureHighlights: ['offensiveRating', 'pace'] },
      },
    }),
  ]);

  await Promise.all([
    prisma.providerLeagueMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'football_data')!.id, externalId: 'PL' } },
      create: {
        providerId: providers.find((item) => item.code === 'football_data')!.id,
        leagueId: premierLeague.id,
        externalId: 'PL',
        externalName: 'Premier League',
        confidence: 1,
      },
      update: { leagueId: premierLeague.id, externalName: 'Premier League', confidence: 1, reviewNeeded: false },
    }),
    prisma.providerLeagueMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'football_data')!.id, externalId: 'TSL' } },
      create: {
        providerId: providers.find((item) => item.code === 'football_data')!.id,
        leagueId: superLig.id,
        externalId: 'TSL',
        externalName: 'Turkey Super Lig',
        confidence: 1,
      },
      update: { leagueId: superLig.id, externalName: 'Turkey Super Lig', confidence: 1, reviewNeeded: false },
    }),
    prisma.providerLeagueMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'ball_dont_lie')!.id, externalId: 'nba' } },
      create: {
        providerId: providers.find((item) => item.code === 'ball_dont_lie')!.id,
        leagueId: nba.id,
        externalId: 'nba',
        externalName: 'NBA',
        confidence: 1,
      },
      update: { leagueId: nba.id, externalName: 'NBA', confidence: 1, reviewNeeded: false },
    }),
  ]);

  await Promise.all([
    prisma.providerTeamMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'football_data')!.id, externalId: '57' } },
      create: {
        providerId: providers.find((item) => item.code === 'football_data')!.id,
        teamId: arsenal.id,
        externalId: '57',
        externalName: 'Arsenal FC',
        confidence: 0.99,
      },
      update: { teamId: arsenal.id, externalName: 'Arsenal FC', confidence: 0.99, reviewNeeded: false },
    }),
    prisma.providerTeamMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'football_data')!.id, externalId: '61' } },
      create: {
        providerId: providers.find((item) => item.code === 'football_data')!.id,
        teamId: chelsea.id,
        externalId: '61',
        externalName: 'Chelsea FC',
        confidence: 0.99,
      },
      update: { teamId: chelsea.id, externalName: 'Chelsea FC', confidence: 0.99, reviewNeeded: false },
    }),
    prisma.providerTeamMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'football_data')!.id, externalId: '1905' } },
      create: {
        providerId: providers.find((item) => item.code === 'football_data')!.id,
        teamId: galatasaray.id,
        externalId: '1905',
        externalName: 'Galatasaray',
        confidence: 0.95,
      },
      update: { teamId: galatasaray.id, externalName: 'Galatasaray', confidence: 0.95, reviewNeeded: false },
    }),
    prisma.providerTeamMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'football_data')!.id, externalId: '1907' } },
      create: {
        providerId: providers.find((item) => item.code === 'football_data')!.id,
        teamId: fenerbahce.id,
        externalId: '1907',
        externalName: 'Fenerbahce',
        confidence: 0.95,
      },
      update: { teamId: fenerbahce.id, externalName: 'Fenerbahce', confidence: 0.95, reviewNeeded: false },
    }),
    prisma.providerTeamMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'ball_dont_lie')!.id, externalId: '14' } },
      create: {
        providerId: providers.find((item) => item.code === 'ball_dont_lie')!.id,
        teamId: lakers.id,
        externalId: '14',
        externalName: 'Los Angeles Lakers',
        confidence: 0.97,
      },
      update: { teamId: lakers.id, externalName: 'Los Angeles Lakers', confidence: 0.97, reviewNeeded: false },
    }),
    prisma.providerTeamMapping.upsert({
      where: { providerId_externalId: { providerId: providers.find((item) => item.code === 'ball_dont_lie')!.id, externalId: '2' } },
      create: {
        providerId: providers.find((item) => item.code === 'ball_dont_lie')!.id,
        teamId: celtics.id,
        externalId: '2',
        externalName: 'Boston Celtics',
        confidence: 0.97,
      },
      update: { teamId: celtics.id, externalName: 'Boston Celtics', confidence: 0.97, reviewNeeded: false },
    }),
  ]);

  await prisma.systemSetting.upsert({
    where: { key: 'supportedLeagues' },
    create: {
      key: 'supportedLeagues',
      isPublic: false,
      description: 'Provider scoped supported leagues for ingestion',
      value: [
        {
          sportCode: 'FOOTBALL',
          providerCode: 'football_data',
          externalIds: ['TSL', 'PL'],
          names: ['Turkey Super Lig', 'England Premier League', 'Premier League', 'Super Lig'],
        },
        {
          sportCode: 'BASKETBALL',
          providerCode: 'ball_dont_lie',
          externalIds: ['nba'],
          names: ['NBA'],
        },
      ],
    },
    update: {
      value: [
        {
          sportCode: 'FOOTBALL',
          providerCode: 'football_data',
          externalIds: ['TSL', 'PL'],
          names: ['Turkey Super Lig', 'England Premier League', 'Premier League', 'Super Lig'],
        },
        {
          sportCode: 'BASKETBALL',
          providerCode: 'ball_dont_lie',
          externalIds: ['nba'],
          names: ['NBA'],
        },
      ],
      isPublic: false,
      description: 'Provider scoped supported leagues for ingestion',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'featureFlags' },
    create: {
      key: 'featureFlags',
      value: {
        predictionsEnabled: true,
        liveEnabled: true,
        ingestionEnabled: true,
      },
      isPublic: true,
      description: 'Global feature flags',
    },
    update: {
      value: {
        predictionsEnabled: true,
        liveEnabled: true,
        ingestionEnabled: true,
      },
      isPublic: true,
      description: 'Global feature flags',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'defaultSystemSettings' },
    create: {
      key: 'defaultSystemSettings',
      value: {
        timezone: 'Europe/Istanbul',
        maxIngestionRetries: 5,
        jobBackoffMs: 1000,
      },
      description: 'Default runtime settings',
      isPublic: false,
    },
    update: {
      value: {
        timezone: 'Europe/Istanbul',
        maxIngestionRetries: 5,
        jobBackoffMs: 1000,
      },
      description: 'Default runtime settings',
      isPublic: false,
    },
  });

  const existingSeedJob = await prisma.ingestionJob.findFirst({
    where: { name: 'syncLeagues', payload: { path: ['seeded'], equals: true } },
  });

  if (!existingSeedJob) {
    await prisma.ingestionJob.create({
      data: {
        providerId: providers.find((item) => item.code === 'football_data')!.id,
        name: 'syncLeagues',
        queueName: 'ingestion',
        status: IngestionStatus.SUCCESS,
        payload: { seeded: true },
        scheduledAt: new Date(),
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
  }

  await Promise.all([
    prisma.teamFormSnapshot.upsert({
      where: { id: 'seed-form-arsenal' },
      create: {
        id: 'seed-form-arsenal',
        teamId: arsenal.id,
        wins: 3,
        draws: 1,
        losses: 1,
        scored: 9,
        conceded: 5,
        formString: 'WWDWL',
        sampleSize: 5,
      },
      update: {
        teamId: arsenal.id,
        wins: 3,
        draws: 1,
        losses: 1,
        scored: 9,
        conceded: 5,
        formString: 'WWDWL',
        sampleSize: 5,
      },
    }),
    prisma.teamFormSnapshot.upsert({
      where: { id: 'seed-form-lakers' },
      create: {
        id: 'seed-form-lakers',
        teamId: lakers.id,
        wins: 4,
        draws: 0,
        losses: 1,
        scored: 560,
        conceded: 534,
        formString: 'WWWLW',
        sampleSize: 5,
      },
      update: {
        teamId: lakers.id,
        wins: 4,
        draws: 0,
        losses: 1,
        scored: 560,
        conceded: 534,
        formString: 'WWWLW',
        sampleSize: 5,
      },
    }),
  ]);

  console.log('Seed completed successfully.');
}

async function upsertProviderConfig(providerId: string, key: string, valueEncrypted: string) {
  await prisma.providerConfig.upsert({
    where: { providerId_key: { providerId, key } },
    create: {
      providerId,
      key,
      valueEncrypted,
      isEnabled: true,
    },
    update: {
      valueEncrypted,
      isEnabled: true,
    },
  });
}

async function upsertTeam(slug: string, sportId: string, name: string, shortName: string, country: string, venue: string, logoUrl: string) {
  return prisma.team.upsert({
    where: { slug },
    create: {
      sportId,
      name,
      shortName,
      slug,
      country,
      venue,
      logoUrl,
    },
    update: {
      sportId,
      name,
      shortName,
      country,
      venue,
      logoUrl,
    },
  });
}

async function upsertPlayer(id: string, teamId: string, name: string, position: string, nationality: string) {
  return prisma.player.upsert({
    where: { id },
    create: {
      id,
      teamId,
      name,
      position,
      nationality,
    },
    update: {
      teamId,
      name,
      position,
      nationality,
    },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

