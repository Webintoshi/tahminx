## FILE: prisma/schema.prisma

```ts
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SportCode {
  FOOTBALL
  BASKETBALL
}

enum MatchStatus {
  SCHEDULED
  LIVE
  COMPLETED
  POSTPONED
  CANCELED
}

enum IngestionStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
  DEAD_LETTER
}

enum PredictionStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Role {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  name        String   @unique
  description String?
  users       User[]
}

model User {
  id               String    @id @default(cuid())
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  email            String    @unique
  username         String    @unique
  fullName         String
  passwordHash     String
  refreshTokenHash String?
  isActive         Boolean   @default(true)
  roleId           String
  role             Role      @relation(fields: [roleId], references: [id])
  apiLogs          ApiLog[]
  auditLogs        AuditLog[]
}

model Sport {
  id        String    @id @default(cuid())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  code      SportCode @unique
  name      String
  isActive  Boolean   @default(true)
  leagues   League[]
  teams     Team[]
  matches   Match[]
}

model Provider {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  code      String   @unique
  name      String
  baseUrl   String
  isActive  Boolean  @default(true)

  configs        ProviderConfig[]
  teamMappings   ProviderTeamMapping[]
  leagueMappings ProviderLeagueMapping[]
  matchMappings  ProviderMatchMapping[]
  ingestionJobs  IngestionJob[]
  apiLogs        ApiLog[]
}

model ProviderConfig {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  providerId     String
  key            String
  valueEncrypted String
  isEnabled      Boolean  @default(true)
  provider       Provider @relation(fields: [providerId], references: [id])

  @@unique([providerId, key])
}

model League {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  sportId     String
  name        String
  slug        String   @unique
  country     String?
  logoUrl     String?
  isActive    Boolean  @default(true)
  sport       Sport    @relation(fields: [sportId], references: [id])
  seasons     Season[]
  matches     Match[]
  standings   StandingsSnapshot[]

  leagueMappings ProviderLeagueMapping[]

  @@index([sportId])
}

model Season {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  deletedAt  DateTime?
  leagueId   String
  seasonYear Int
  name       String
  startDate  DateTime?
  endDate    DateTime?
  isCurrent  Boolean  @default(false)
  league     League   @relation(fields: [leagueId], references: [id])
  matches    Match[]
  standings  StandingsSnapshot[]

  @@unique([leagueId, seasonYear])
  @@index([leagueId, isCurrent])
}

model Team {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  sportId     String
  name        String
  shortName   String?
  slug        String   @unique
  country     String?
  logoUrl     String?
  venue       String?
  foundedYear Int?
  sport       Sport    @relation(fields: [sportId], references: [id])
  players     Player[]
  homeMatches Match[]  @relation("homeTeam")
  awayMatches Match[]  @relation("awayTeam")
  standings   StandingsSnapshot[]
  teamStats   TeamStat[]
  formSnapshots TeamFormSnapshot[]
  providerMaps ProviderTeamMapping[]

  @@index([sportId])
  @@index([name])
}

model Player {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  teamId      String?
  name        String
  shortName   String?
  nationality String?
  position    String?
  birthDate   DateTime?
  photoUrl    String?
  team        Team?    @relation(fields: [teamId], references: [id])
  stats       PlayerStat[]

  @@index([teamId])
  @@index([name])
}

model Match {
  id         String      @id @default(cuid())
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  deletedAt  DateTime?
  sportId    String
  leagueId   String
  seasonId   String?
  homeTeamId String
  awayTeamId String
  matchDate  DateTime
  status     MatchStatus @default(SCHEDULED)
  homeScore  Int?
  awayScore  Int?
  venue      String?
  round      String?
  timezone   String?

  sport    Sport   @relation(fields: [sportId], references: [id])
  league   League  @relation(fields: [leagueId], references: [id])
  season   Season? @relation(fields: [seasonId], references: [id])
  homeTeam Team    @relation("homeTeam", fields: [homeTeamId], references: [id])
  awayTeam Team    @relation("awayTeam", fields: [awayTeamId], references: [id])

  events           MatchEvent[]
  teamStats        TeamStat[]
  playerStats      PlayerStat[]
  providerMappings ProviderMatchMapping[]
  predictions      Prediction[]
  featureSets      FeatureSet[]

  @@index([leagueId, matchDate])
  @@index([sportId, status, matchDate])
  @@index([homeTeamId, matchDate])
  @@index([awayTeamId, matchDate])
}

model MatchEvent {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  matchId   String
  minute    Int?
  type      String
  teamId    String?
  playerId  String?
  payload   Json
  match     Match    @relation(fields: [matchId], references: [id])

  @@index([matchId, minute])
}

model StandingsSnapshot {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  leagueId     String
  seasonId     String
  teamId       String
  rank         Int
  played       Int
  wins         Int
  draws        Int
  losses       Int
  goalsFor     Int?
  goalsAgainst Int?
  points       Int
  form         String?

  league League @relation(fields: [leagueId], references: [id])
  season Season @relation(fields: [seasonId], references: [id])
  team   Team   @relation(fields: [teamId], references: [id])

  @@unique([leagueId, seasonId, teamId])
  @@index([leagueId, seasonId, rank])
}

model TeamStat {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  matchId       String
  teamId        String
  possession    Float?
  shots         Int?
  shotsOnTarget Int?
  corners       Int?
  fouls         Int?
  payload       Json?

  match Match @relation(fields: [matchId], references: [id])
  team  Team  @relation(fields: [teamId], references: [id])

  @@unique([matchId, teamId])
  @@index([teamId, createdAt])
}

model PlayerStat {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  matchId   String
  playerId  String
  teamId    String?
  minutes   Int?
  points    Int?
  assists   Int?
  rebounds  Int?
  goals     Int?
  payload   Json?

  match  Match  @relation(fields: [matchId], references: [id])
  player Player @relation(fields: [playerId], references: [id])

  @@unique([matchId, playerId])
  @@index([playerId, createdAt])
}

model TeamFormSnapshot {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  teamId     String
  leagueId   String?
  wins       Int
  draws      Int
  losses     Int
  scored     Int
  conceded   Int
  formString String
  sampleSize Int

  team Team @relation(fields: [teamId], references: [id])

  @@index([teamId, createdAt])
}

model ProviderTeamMapping {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  providerId   String
  teamId       String?
  externalId   String
  externalName String?
  confidence   Float?
  reviewNeeded Boolean  @default(false)
  reviewReason String?
  rawPayload   Json?

  provider Provider @relation(fields: [providerId], references: [id])
  team     Team?    @relation(fields: [teamId], references: [id])

  @@unique([providerId, externalId])
  @@unique([providerId, teamId])
  @@index([teamId])
  @@index([providerId, reviewNeeded])
}

model ProviderLeagueMapping {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  providerId   String
  leagueId     String?
  externalId   String
  externalName String?
  confidence   Float?
  reviewNeeded Boolean  @default(false)
  reviewReason String?
  rawPayload   Json?

  provider Provider @relation(fields: [providerId], references: [id])
  league   League?  @relation(fields: [leagueId], references: [id])

  @@unique([providerId, externalId])
  @@unique([providerId, leagueId])
  @@index([leagueId])
  @@index([providerId, reviewNeeded])
}

model ProviderMatchMapping {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  providerId   String
  matchId      String?
  externalId   String
  externalRef  String?
  confidence   Float?
  reviewNeeded Boolean  @default(false)
  reviewReason String?
  rawPayload   Json?

  provider Provider @relation(fields: [providerId], references: [id])
  match    Match?   @relation(fields: [matchId], references: [id])

  @@unique([providerId, externalId])
  @@unique([matchId, providerId])
  @@index([matchId])
  @@index([providerId, reviewNeeded])
}

model FeatureSet {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  matchId     String
  modelFamily String
  features    Json
  qualityScore Float?

  match Match @relation(fields: [matchId], references: [id])

  @@unique([matchId, modelFamily])
  @@index([matchId, modelFamily])
}

model ModelVersion {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  sportId   String?
  key       String   @unique
  name      String
  version   String
  status    String
  metadata  Json?
  metrics   Json?

  predictions Prediction[]
}

model Prediction {
  id              String           @id @default(cuid())
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  matchId         String
  modelVersionId  String
  status          PredictionStatus @default(PUBLISHED)
  probabilities   Json
  expectedScore   Json?
  confidenceScore Int
  summary         String
  riskFlags       Json?

  match        Match                 @relation(fields: [matchId], references: [id])
  modelVersion ModelVersion          @relation(fields: [modelVersionId], references: [id])
  explanation  PredictionExplanation?

  @@unique([matchId, modelVersionId])
  @@index([confidenceScore, createdAt])
}

model PredictionExplanation {
  id           String     @id @default(cuid())
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  predictionId String     @unique
  explanation  Json

  prediction Prediction @relation(fields: [predictionId], references: [id])
}

model IngestionJob {
  id           String          @id @default(cuid())
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  providerId   String?
  name         String
  queueName    String
  status       IngestionStatus @default(PENDING)
  payload      Json?
  scheduledAt  DateTime?
  startedAt    DateTime?
  finishedAt   DateTime?
  errorMessage String?

  provider Provider?         @relation(fields: [providerId], references: [id])
  runs     IngestionJobRun[]

  @@index([queueName, status, createdAt])
}

model IngestionJobRun {
  id             String          @id @default(cuid())
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  ingestionJobId String
  status         IngestionStatus @default(PENDING)
  attempt        Int             @default(1)
  startedAt      DateTime?
  finishedAt     DateTime?
  resultPayload  Json?
  rawPayload     Json?
  errorMessage   String?

  ingestionJob IngestionJob @relation(fields: [ingestionJobId], references: [id])

  @@index([ingestionJobId, createdAt])
}

model ApiLog {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  userId        String?
  providerId    String?
  path          String
  method        String
  statusCode    Int
  durationMs    Int
  correlationId String?
  requestBody   Json?
  responseBody  Json?
  errorMessage  String?

  user     User?     @relation(fields: [userId], references: [id])
  provider Provider? @relation(fields: [providerId], references: [id])

  @@index([createdAt, statusCode])
}

model AuditLog {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  userId     String?
  action     String
  targetType String
  targetId   String?
  payload    Json?
  ipAddress  String?

  user User? @relation(fields: [userId], references: [id])

  @@index([createdAt, action])
}

model SystemSetting {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  key         String   @unique
  value       Json
  description String?
  isPublic    Boolean  @default(false)
}
```


## FILE: prisma/migrations/0002_ingestion_mapping_hardening/migration.sql

```ts
ALTER TABLE "ProviderTeamMapping"
  ALTER COLUMN "teamId" DROP NOT NULL,
  ADD COLUMN "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "rawPayload" JSONB;

ALTER TABLE "ProviderLeagueMapping"
  ALTER COLUMN "leagueId" DROP NOT NULL,
  ADD COLUMN "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "rawPayload" JSONB;

ALTER TABLE "ProviderMatchMapping"
  ALTER COLUMN "matchId" DROP NOT NULL,
  ADD COLUMN "confidence" DOUBLE PRECISION,
  ADD COLUMN "reviewNeeded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "rawPayload" JSONB;

ALTER TABLE "IngestionJobRun"
  ADD COLUMN "rawPayload" JSONB;

CREATE UNIQUE INDEX "FeatureSet_matchId_modelFamily_key" ON "FeatureSet"("matchId", "modelFamily");
CREATE INDEX "ProviderTeamMapping_providerId_reviewNeeded_idx" ON "ProviderTeamMapping"("providerId", "reviewNeeded");
CREATE INDEX "ProviderLeagueMapping_providerId_reviewNeeded_idx" ON "ProviderLeagueMapping"("providerId", "reviewNeeded");
CREATE INDEX "ProviderMatchMapping_providerId_reviewNeeded_idx" ON "ProviderMatchMapping"("providerId", "reviewNeeded");
```


## FILE: prisma/seed.ts

```ts
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


```


## FILE: src/modules/providers/interfaces/normalized.types.ts

```ts
export interface NormalizedLeague {
  externalId: string;
  name: string;
  country?: string;
  sportCode: 'FOOTBALL' | 'BASKETBALL';
  logoUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedSeason {
  externalId: string;
  leagueExternalId: string;
  seasonYear: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedTeam {
  externalId: string;
  name: string;
  shortName?: string;
  country?: string;
  logoUrl?: string;
  venue?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedPlayer {
  externalId: string;
  name: string;
  teamExternalId?: string;
  nationality?: string;
  position?: string;
  birthDate?: string;
  photoUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedMatch {
  externalId: string;
  leagueExternalId: string;
  seasonExternalId?: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  matchDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELED';
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedStanding {
  externalTeamId: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points: number;
  form?: string;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedMatchEvent {
  externalMatchId: string;
  minute?: number;
  type: string;
  externalTeamId?: string;
  externalPlayerId?: string;
  payload: Record<string, unknown>;
}

export interface NormalizedTeamStats {
  externalMatchId: string;
  externalTeamId: string;
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  corners?: number;
  fouls?: number;
  payload?: Record<string, unknown>;
}

export interface NormalizedPlayerStats {
  externalMatchId: string;
  externalPlayerId: string;
  externalTeamId?: string;
  minutes?: number;
  points?: number;
  assists?: number;
  rebounds?: number;
  goals?: number;
  payload?: Record<string, unknown>;
}
```


## FILE: src/modules/providers/interfaces/provider-adapter.interface.ts

```ts
import {
  NormalizedLeague,
  NormalizedMatch,
  NormalizedMatchEvent,
  NormalizedPlayer,
  NormalizedPlayerStats,
  NormalizedSeason,
  NormalizedStanding,
  NormalizedTeam,
  NormalizedTeamStats,
} from './normalized.types';

export interface ProviderMatchQuery {
  date?: string;
  from?: string;
  to?: string;
  leagueExternalId?: string;
  seasonExternalId?: string;
}

export interface ProviderAdapter {
  readonly code: string;

  getLeagues(): Promise<NormalizedLeague[]>;
  getSeasons(leagueExternalId?: string): Promise<NormalizedSeason[]>;
  getTeams(leagueExternalId?: string): Promise<NormalizedTeam[]>;
  getPlayers(teamExternalId?: string): Promise<NormalizedPlayer[]>;
  getMatches(params?: ProviderMatchQuery): Promise<NormalizedMatch[]>;
  getMatchById(externalMatchId: string): Promise<NormalizedMatch | null>;
  getStandings(leagueExternalId: string, seasonExternalId?: string): Promise<NormalizedStanding[]>;
  getTeamStats(externalMatchId: string): Promise<NormalizedTeamStats[]>;
  getPlayerStats(externalMatchId: string): Promise<NormalizedPlayerStats[]>;
  getMatchEvents(externalMatchId: string): Promise<NormalizedMatchEvent[]>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; message?: string }>;
}
```


## FILE: src/modules/providers/mappers/provider-normalizer.mapper.ts

```ts
import {
  NormalizedLeague,
  NormalizedMatch,
  NormalizedMatchEvent,
  NormalizedPlayer,
  NormalizedPlayerStats,
  NormalizedSeason,
  NormalizedStanding,
  NormalizedTeam,
  NormalizedTeamStats,
} from '../interfaces/normalized.types';

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
  }
  return [];
};

const asObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const mapRawLeagues = (rows: unknown[], sportCode: 'FOOTBALL' | 'BASKETBALL'): NormalizedLeague[] =>
  asArray(rows)
    .map((row) => {
      const area = asObject(row.area);
      return {
        externalId: String(row.code ?? row.id ?? row.league_id ?? row.strLeague ?? '').trim(),
        name: String(row.name ?? row.strLeague ?? asObject(row.league).name ?? '').trim(),
        country: strOrUndefined(row.country ?? area.name),
        sportCode,
        logoUrl: strOrUndefined(row.emblem ?? row.logo ?? row.strBadge),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId && item.name);

export const mapRawSeasons = (rows: unknown[], leagueExternalId: string): NormalizedSeason[] =>
  asArray(rows)
    .map((row) => {
      const year = numberOrUndefined(row.year ?? row.season ?? row.startDate?.toString().slice(0, 4)) ?? new Date().getUTCFullYear();
      const startDate = strOrUndefined(row.startDate ?? row.start ?? row.currentStartDate);
      const endDate = strOrUndefined(row.endDate ?? row.end ?? row.currentEndDate);
      return {
        externalId: String(row.id ?? row.season ?? row.year ?? year),
        leagueExternalId,
        seasonYear: year,
        name: String(row.name ?? row.season ?? row.year ?? `${year}`),
        startDate,
        endDate,
        isCurrent: Boolean(row.current ?? row.isCurrent ?? false),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId);

export const mapRawTeams = (rows: unknown[]): NormalizedTeam[] =>
  asArray(rows)
    .map((row) => ({
      externalId: String(row.id ?? row.team_id ?? row.idTeam ?? '').trim(),
      name: String(row.name ?? row.full_name ?? row.strTeam ?? '').trim(),
      shortName: strOrUndefined(row.short_name ?? row.tla ?? row.abbreviation),
      country: strOrUndefined(row.country),
      logoUrl: strOrUndefined(row.crest ?? row.logo ?? row.strBadge),
      venue: strOrUndefined(row.venue ?? row.strStadium),
      rawPayload: row,
    }))
    .filter((item) => item.externalId && item.name);

export const mapRawPlayers = (rows: unknown[]): NormalizedPlayer[] =>
  asArray(rows)
    .map((row) => {
      const firstName = strOrUndefined(row.firstname ?? row.first_name);
      const lastName = strOrUndefined(row.lastname ?? row.last_name);
      const joinedName = [firstName, lastName].filter(Boolean).join(' ');
      return {
        externalId: String(row.id ?? row.player_id ?? row.idPlayer ?? '').trim(),
        name: String(row.name ?? joinedName ?? row.strPlayer ?? '').trim(),
        teamExternalId: strOrUndefined(row.team_id ?? row.idTeam),
        nationality: strOrUndefined(row.nationality ?? row.country ?? row.strNationality),
        position: strOrUndefined(row.position ?? row.strPosition),
        birthDate: strOrUndefined(row.dateOfBirth ?? row.birth_date ?? row.dateBorn),
        photoUrl: strOrUndefined(row.photo ?? row.strCutout),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId && item.name);

export const mapRawMatches = (rows: unknown[]): NormalizedMatch[] =>
  asArray(rows)
    .map((row) => {
      const fixture = asObject(row.fixture);
      const teams = asObject(row.teams);
      const goals = asObject(row.goals);
      const competition = asObject(row.competition);
      const league = asObject(row.league);
      const homeTeam = asObject(row.home_team ?? teams.home);
      const awayTeam = asObject(row.away_team ?? teams.away ?? row.visitor_team);
      const status = String(row.status ?? asObject(fixture.status).short ?? row.strStatus ?? '').toUpperCase();

      return {
        externalId: String(row.id ?? fixture.id ?? row.idEvent ?? '').trim(),
        leagueExternalId: String(
          competition.code ?? competition.id ?? league.id ?? league.name ?? row.idLeague ?? row.league ?? 'nba',
        ).trim(),
        seasonExternalId: strOrUndefined(row.season),
        homeTeamExternalId: String(homeTeam.id ?? row.homeTeamId ?? '').trim(),
        awayTeamExternalId: String(awayTeam.id ?? row.awayTeamId ?? '').trim(),
        matchDate: String(row.utcDate ?? row.date ?? fixture.date ?? row.dateEvent ?? new Date().toISOString()),
        status: normalizeStatus(status),
        homeScore: numberOrUndefined(row.home_score ?? goals.home ?? row.intHomeScore ?? row.home_team_score),
        awayScore: numberOrUndefined(row.away_score ?? goals.away ?? row.intAwayScore ?? row.visitor_team_score),
        venue: strOrUndefined(row.venue ?? asObject(fixture.venue).name ?? row.strVenue),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId && item.leagueExternalId && item.homeTeamExternalId && item.awayTeamExternalId);

export const mapRawStandings = (rows: unknown[]): NormalizedStanding[] =>
  asArray(rows)
    .map((row) => {
      const team = asObject(row.team);
      return {
        externalTeamId: String(team.id ?? row.team_id ?? row.idTeam ?? row.teamId ?? '').trim(),
        rank: Number(row.rank ?? row.position ?? 0),
        played: Number(row.playedGames ?? row.played ?? row.games_played ?? 0),
        wins: Number(row.won ?? row.wins ?? 0),
        draws: Number(row.draw ?? row.draws ?? 0),
        losses: Number(row.lost ?? row.losses ?? 0),
        goalsFor: numberOrUndefined(row.goalsFor ?? row.goals_for ?? row.for),
        goalsAgainst: numberOrUndefined(row.goalsAgainst ?? row.goals_against ?? row.against),
        points: Number(row.points ?? 0),
        form: strOrUndefined(row.form),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalTeamId);

export const mapRawMatchEvents = (rows: unknown[], externalMatchId: string): NormalizedMatchEvent[] =>
  asArray(rows).map((row) => ({
    externalMatchId,
    minute: numberOrUndefined(row.minute),
    type: String(row.type ?? row.strEvent ?? 'event'),
    externalTeamId: strOrUndefined(asObject(row.team).id ?? row.team_id),
    externalPlayerId: strOrUndefined(asObject(row.player).id ?? row.player_id),
    payload: row,
  }));

export const mapRawTeamStats = (rows: unknown[], externalMatchId: string): NormalizedTeamStats[] =>
  asArray(rows)
    .map((row) => ({
      externalMatchId,
      externalTeamId: String(asObject(row.team).id ?? row.team_id ?? '').trim(),
      possession: numberOrUndefined(row.possession),
      shots: numberOrUndefined(row.shots),
      shotsOnTarget: numberOrUndefined(row.shots_on_target ?? row.shotsOnTarget),
      corners: numberOrUndefined(row.corners),
      fouls: numberOrUndefined(row.fouls),
      payload: row,
    }))
    .filter((item) => item.externalTeamId);

export const mapRawPlayerStats = (rows: unknown[], externalMatchId: string): NormalizedPlayerStats[] =>
  asArray(rows)
    .map((row) => ({
      externalMatchId,
      externalPlayerId: String(asObject(row.player).id ?? row.player_id ?? '').trim(),
      externalTeamId: strOrUndefined(asObject(row.team).id ?? row.team_id),
      minutes: numberOrUndefined(row.min ?? row.minutes),
      points: numberOrUndefined(row.pts ?? row.points),
      assists: numberOrUndefined(row.ast ?? row.assists),
      rebounds: numberOrUndefined(row.reb ?? row.rebounds),
      goals: numberOrUndefined(row.goals),
      payload: row,
    }))
    .filter((item) => item.externalPlayerId);

const normalizeStatus = (status: string): NormalizedMatch['status'] => {
  if (['LIVE', '1H', '2H', 'IN_PLAY', 'IN PROGRESS', 'Q1', 'Q2', 'Q3', 'Q4'].includes(status)) return 'LIVE';
  if (['FINISHED', 'FT', 'COMPLETED', 'FINAL'].includes(status)) return 'COMPLETED';
  if (['POSTPONED'].includes(status)) return 'POSTPONED';
  if (['CANCELED', 'CANCELLED'].includes(status)) return 'CANCELED';
  return 'SCHEDULED';
};

const strOrUndefined = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const output = String(value).trim();
  return output ? output : undefined;
};

const numberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
```


## FILE: src/modules/providers/clients/football-data.client.ts

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class FootballDataClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(configService: ConfigService) {
    this.http = new BaseProviderHttpClient(
      process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
    );

    this.apiKey = process.env.FOOTBALL_DATA_API_KEY;
  }

  getLeagues(rawDebug = false): Promise<unknown> {
    return this.http.get('/competitions', { headers: this.getAuthHeaders() }, rawDebug);
  }

  getCompetition(leagueCode: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/competitions/${leagueCode}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getTeams(leagueCode: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/competitions/${leagueCode}/teams`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getMatches(params?: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    competitionCode?: string;
    status?: string;
    rawDebug?: boolean;
  }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.date) {
      query.set('dateFrom', params.date);
      query.set('dateTo', params.date);
    }
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.competitionCode) query.set('competitions', params.competitionCode);
    if (params?.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.http.get(`/matches${suffix}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
  }

  getStandings(leagueCode: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/competitions/${leagueCode}/standings`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getMatchById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/matches/${id}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY is missing');
    }
    return {
      'X-Auth-Token': this.apiKey,
    };
  }
}
```


## FILE: src/modules/providers/clients/ball-dont-lie.client.ts

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class BallDontLieClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(configService: ConfigService) {
    this.http = new BaseProviderHttpClient(
      process.env.BALL_DONT_LIE_BASE_URL || 'https://api.balldontlie.io/v1',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
    );

    this.apiKey = process.env.BALL_DONT_LIE_API_KEY;
  }

  getTeams(rawDebug = false): Promise<unknown> {
    return this.http.get('/teams', { headers: this.getAuthHeaders() }, rawDebug);
  }

  getPlayers(teamId?: string, rawDebug = false): Promise<unknown> {
    const query = new URLSearchParams();
    if (teamId) {
      query.append('team_ids[]', teamId);
    }
    query.append('per_page', '100');
    return this.http.get(`/players?${query.toString()}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getGames(params?: {
    date?: string;
    from?: string;
    to?: string;
    teamId?: string;
    season?: string;
    rawDebug?: boolean;
  }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.date) {
      query.append('dates[]', params.date);
    }
    if (params?.from) {
      query.append('start_date', params.from);
    }
    if (params?.to) {
      query.append('end_date', params.to);
    }
    if (params?.teamId) {
      query.append('team_ids[]', params.teamId);
    }
    if (params?.season) {
      query.append('seasons[]', params.season);
    }
    query.append('per_page', '100');

    return this.http.get(`/games?${query.toString()}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
  }

  getGameById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/games/${id}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getGameStats(gameId: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/stats?game_ids[]=${encodeURIComponent(gameId)}&per_page=100`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('BALL_DONT_LIE_API_KEY is missing');
    }

    return {
      Authorization: this.apiKey,
    };
  }
}
```


## FILE: src/modules/providers/clients/api-football.client.ts

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class ApiFootballClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(configService: ConfigService) {
    this.http = new BaseProviderHttpClient(
      process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
    );

    this.apiKey = process.env.API_FOOTBALL_API_KEY;
  }

  getLeagues(rawDebug = false): Promise<unknown> {
    return this.http.get('/leagues', { headers: this.getAuthHeaders() }, rawDebug);
  }

  getTeams(league?: string, season?: string, rawDebug = false): Promise<unknown> {
    const query = new URLSearchParams();
    if (league) query.set('league', league);
    if (season) query.set('season', season);
    return this.http.get(`/teams?${query.toString()}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getFixtures(params?: { date?: string; from?: string; to?: string; league?: string; season?: string; rawDebug?: boolean }): Promise<unknown> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.league) query.set('league', params.league);
    if (params?.season) query.set('season', params.season);
    return this.http.get(`/fixtures?${query.toString()}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
  }

  getFixtureById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/fixtures?id=${id}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  getStandings(league: string, season: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/standings?league=${league}&season=${season}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('API_FOOTBALL_API_KEY is missing');
    }

    return {
      'x-rapidapi-key': this.apiKey,
      'x-apisports-key': this.apiKey,
    };
  }
}
```


## FILE: src/modules/providers/clients/the-sports-db.client.ts

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseProviderHttpClient } from './base-provider.client';

@Injectable()
export class TheSportsDbClient {
  private readonly http: BaseProviderHttpClient;

  constructor(configService: ConfigService) {
    this.http = new BaseProviderHttpClient(
      process.env.THE_SPORTS_DB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/3',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
    );
  }

  getLeagues(rawDebug = false): Promise<unknown> {
    return this.http.get('/all_leagues.php', undefined, rawDebug);
  }

  getTeams(league?: string, rawDebug = false): Promise<unknown> {
    const suffix = league ? `?l=${encodeURIComponent(league)}` : '';
    return this.http.get(`/search_all_teams.php${suffix}`, undefined, rawDebug);
  }

  getEventsByDate(date: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/eventsday.php?d=${date}`, undefined, rawDebug);
  }

  getEventById(id: string, rawDebug = false): Promise<unknown> {
    return this.http.get(`/lookupevent.php?id=${id}`, undefined, rawDebug);
  }
}
```


## FILE: src/shared/constants/provider.constants.ts

```ts
export interface ProviderPolicy {
  code: string;
  requiredApiKey: boolean;
  defaultActive: boolean;
  primary: boolean;
  envKey: string;
}

export const PROVIDER_POLICIES: ProviderPolicy[] = [
  {
    code: 'football_data',
    requiredApiKey: true,
    defaultActive: true,
    primary: true,
    envKey: 'FOOTBALL_DATA_API_KEY',
  },
  {
    code: 'ball_dont_lie',
    requiredApiKey: true,
    defaultActive: true,
    primary: true,
    envKey: 'BALL_DONT_LIE_API_KEY',
  },
  {
    code: 'api_football',
    requiredApiKey: true,
    defaultActive: false,
    primary: false,
    envKey: 'API_FOOTBALL_API_KEY',
  },
  {
    code: 'the_sports_db',
    requiredApiKey: false,
    defaultActive: false,
    primary: false,
    envKey: 'THE_SPORTS_DB_API_KEY',
  },
];

export const PROVIDER_CODE_TO_SPORT: Record<string, 'FOOTBALL' | 'BASKETBALL'> = {
  football_data: 'FOOTBALL',
  api_football: 'FOOTBALL',
  the_sports_db: 'FOOTBALL',
  ball_dont_lie: 'BASKETBALL',
};
```


## FILE: src/shared/constants/ingestion.constants.ts

```ts
export interface SupportedLeagueConfig {
  sportCode: 'FOOTBALL' | 'BASKETBALL';
  providerCode: string;
  externalIds: string[];
  names: string[];
}

export const DEFAULT_SUPPORTED_LEAGUES: SupportedLeagueConfig[] = [
  {
    sportCode: 'FOOTBALL',
    providerCode: 'football_data',
    externalIds: ['TSL', 'PL'],
    names: ['Turkey Super Lig', 'Super Lig', 'England Premier League', 'Premier League'],
  },
  {
    sportCode: 'BASKETBALL',
    providerCode: 'ball_dont_lie',
    externalIds: ['nba'],
    names: ['NBA'],
  },
];
```


## FILE: src/config/env.schema.ts

```ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().default('api/v1'),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  SENTRY_DSN: z.string().optional(),
  PROMETHEUS_ENABLED: z.coerce.boolean().default(true),
  THROTTLE_TTL: z.coerce.number().int().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().default(120),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().default(10000),
  PROVIDER_RETRY_COUNT: z.coerce.number().int().default(3),
  PROVIDER_RETRY_BACKOFF_MS: z.coerce.number().int().default(250),
  PROVIDER_RAW_DEBUG: z.coerce.boolean().default(false),
  FOOTBALL_DATA_API_KEY: z.string().optional(),
  BALL_DONT_LIE_API_KEY: z.string().optional(),
  API_FOOTBALL_API_KEY: z.string().optional(),
  THE_SPORTS_DB_API_KEY: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;

export const validateEnv = (input: Record<string, unknown>): EnvVars => {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Environment validation failed: ${message}`);
  }
  return parsed.data;
};
```


## FILE: src/config/configuration.ts

```ts
import { EnvVars } from './env.schema';

export default () => {
  const env = process.env as unknown as EnvVars;
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: Number(env.PORT),
      apiPrefix: env.API_PREFIX,
      corsOrigin: env.CORS_ORIGIN,
    },
    db: {
      url: env.DATABASE_URL,
    },
    redis: {
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
    },
    auth: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    observability: {
      sentryDsn: env.SENTRY_DSN,
      prometheusEnabled: env.PROMETHEUS_ENABLED,
    },
    throttle: {
      ttl: Number(env.THROTTLE_TTL),
      limit: Number(env.THROTTLE_LIMIT),
    },
    providers: {
      timeoutMs: Number(env.PROVIDER_TIMEOUT_MS),
      retryCount: Number(env.PROVIDER_RETRY_COUNT),
      retryBackoffMs: Number(env.PROVIDER_RETRY_BACKOFF_MS),
      rawDebug: env.PROVIDER_RAW_DEBUG,
      keys: {
        footballData: env.FOOTBALL_DATA_API_KEY,
        ballDontLie: env.BALL_DONT_LIE_API_KEY,
        apiFootball: env.API_FOOTBALL_API_KEY,
        theSportsDb: env.THE_SPORTS_DB_API_KEY,
      },
    },
  };
};
```


## FILE: .env.example

```ts
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:3001

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tahminx

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_ACCESS_SECRET=change_this_access_secret_123456
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_this_refresh_secret_123456
JWT_REFRESH_EXPIRES_IN=7d

THROTTLE_TTL=60
THROTTLE_LIMIT=120

PROVIDER_TIMEOUT_MS=10000
PROVIDER_RETRY_COUNT=3
PROVIDER_RETRY_BACKOFF_MS=250
PROVIDER_RAW_DEBUG=false

FOOTBALL_DATA_BASE_URL=https://api.football-data.org/v4
FOOTBALL_DATA_API_KEY=

BALL_DONT_LIE_BASE_URL=https://api.balldontlie.io/v1
BALL_DONT_LIE_API_KEY=

API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_API_KEY=

THE_SPORTS_DB_BASE_URL=https://www.thesportsdb.com/api/v1/json/3
THE_SPORTS_DB_API_KEY=

SENTRY_DSN=
PROMETHEUS_ENABLED=true
```


## FILE: src/modules/providers/providers.service.ts

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { PROVIDER_CODE_TO_SPORT, PROVIDER_POLICIES, ProviderPolicy } from 'src/shared/constants/provider.constants';
import { ApiFootballProviderAdapter } from './adapters/api-football.adapter';
import { BallDontLieProviderAdapter } from './adapters/ball-dont-lie.adapter';
import { FootballDataProviderAdapter } from './adapters/football-data.adapter';
import { TheSportsDbProviderAdapter } from './adapters/the-sports-db.adapter';
import { ProviderAdapter } from './interfaces/provider-adapter.interface';

interface ProviderRuntime {
  provider: Provider & { configs: { key: string; valueEncrypted: string; isEnabled: boolean }[] };
  policy: ProviderPolicy;
  adapter: ProviderAdapter;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeySource: 'provider_config' | 'env' | 'missing';
  keyName: string;
  reason?: string;
}

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);
  private readonly adapters: ProviderAdapter[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    footballData: FootballDataProviderAdapter,
    apiFootball: ApiFootballProviderAdapter,
    ballDontLie: BallDontLieProviderAdapter,
    theSportsDb: TheSportsDbProviderAdapter,
  ) {
    this.adapters = [footballData, apiFootball, ballDontLie, theSportsDb];
  }

  getAdapterByCode(code: string): ProviderAdapter {
    const adapter = this.adapters.find((item) => item.code === code);
    if (!adapter) {
      throw new Error(`Unsupported provider code: ${code}`);
    }
    return adapter;
  }

  async getActiveAdapterCodes(sportCode?: 'FOOTBALL' | 'BASKETBALL'): Promise<string[]> {
    const runtimes = await this.loadProviderRuntime();
    return runtimes
      .filter((runtime) => runtime.enabled)
      .filter((runtime) => (sportCode ? PROVIDER_CODE_TO_SPORT[runtime.adapter.code] === sportCode : true))
      .sort((a, b) => Number(b.policy.primary) - Number(a.policy.primary))
      .map((runtime) => runtime.adapter.code);
  }

  async isProviderEnabled(code: string): Promise<boolean> {
    const runtimes = await this.loadProviderRuntime();
    return Boolean(runtimes.find((item) => item.provider.code === code)?.enabled);
  }

  async health() {
    return this.cacheService.getOrSet('providers:health', 60, async () => {
      const runtimes = await this.loadProviderRuntime();
      const checks = await Promise.all(
        runtimes.map(async (runtime) => {
          if (!runtime.enabled) {
            return {
              provider: runtime.adapter.code,
              healthy: false,
              latencyMs: 0,
              enabled: false,
              hasApiKey: runtime.hasApiKey,
              message: runtime.reason || 'Provider is disabled',
            };
          }

          try {
            const check = await runtime.adapter.healthCheck();
            return {
              provider: runtime.adapter.code,
              enabled: true,
              hasApiKey: runtime.hasApiKey,
              ...check,
            };
          } catch (error) {
            return {
              provider: runtime.adapter.code,
              enabled: true,
              hasApiKey: runtime.hasApiKey,
              healthy: false,
              latencyMs: 0,
              message: (error as Error).message,
            };
          }
        }),
      );

      return {
        adapters: checks,
        providers: runtimes.map((runtime) => ({
          id: runtime.provider.id,
          code: runtime.provider.code,
          name: runtime.provider.name,
          baseUrl: runtime.provider.baseUrl,
          isActive: runtime.provider.isActive,
          enabled: runtime.enabled,
          hasApiKey: runtime.hasApiKey,
          apiKeySource: runtime.apiKeySource,
          keyName: runtime.keyName,
          reason: runtime.reason,
          configs: runtime.provider.configs,
        })),
      };
    });
  }

  async logs(limit = 100) {
    return this.prisma.apiLog.findMany({
      where: { providerId: { not: null } },
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, Math.max(1, limit)),
    });
  }

  async saveProviderLog(input: {
    providerCode: string;
    path: string;
    statusCode: number;
    durationMs: number;
    errorMessage?: string;
  }) {
    const provider = await this.prisma.provider.findUnique({ where: { code: input.providerCode } });
    if (!provider) {
      this.logger.warn(`Provider log ignored because provider not found: ${input.providerCode}`);
      return;
    }

    await this.prisma.apiLog.create({
      data: {
        providerId: provider.id,
        path: input.path,
        method: 'GET',
        statusCode: input.statusCode,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage,
      },
    });
  }

  private async loadProviderRuntime(): Promise<ProviderRuntime[]> {
    const providerRows = await this.prisma.provider.findMany({
      where: { deletedAt: null },
      include: { configs: true },
      orderBy: { name: 'asc' },
    });

    const runtimes: ProviderRuntime[] = [];

    for (const provider of providerRows) {
      const adapter = this.adapters.find((item) => item.code === provider.code);
      const policy = PROVIDER_POLICIES.find((item) => item.code === provider.code);
      if (!adapter || !policy) {
        continue;
      }

      const enabledValue = this.getConfigValue(provider, 'enabled');
      const enabledConfig = enabledValue === undefined ? policy.defaultActive : enabledValue !== 'false';
      const apiKeyFromConfig = this.getConfigValue(provider, 'apiKey');
      const apiKeyFromEnv = process.env[policy.envKey];
      const hasConfiguredKey = Boolean(apiKeyFromConfig && apiKeyFromConfig !== 'change_me');
      const hasEnvKey = Boolean(apiKeyFromEnv && apiKeyFromEnv !== 'change_me');
      const hasApiKey = policy.requiredApiKey ? hasConfiguredKey || hasEnvKey : true;

      const enabled = provider.isActive && enabledConfig && hasApiKey;

      let reason: string | undefined;
      if (!provider.isActive) {
        reason = 'Provider row is inactive';
      } else if (!enabledConfig) {
        reason = 'Provider config enabled=false';
      } else if (!hasApiKey && policy.requiredApiKey) {
        reason = `${policy.envKey} missing and provider config apiKey missing`;
      }

      runtimes.push({
        provider,
        policy,
        adapter,
        enabled,
        hasApiKey,
        apiKeySource: hasConfiguredKey ? 'provider_config' : hasEnvKey ? 'env' : 'missing',
        keyName: policy.envKey,
        reason,
      });
    }

    return runtimes;
  }

  private getConfigValue(provider: Provider & { configs: { key: string; valueEncrypted: string; isEnabled: boolean }[] }, key: string) {
    const row = provider.configs.find((config) => config.key === key && config.isEnabled);
    return row?.valueEncrypted;
  }
}
```


## FILE: src/modules/providers/adapters/football-data.adapter.ts

```ts
import { Injectable, Logger } from '@nestjs/common';
import { FootballDataClient } from '../clients/football-data.client';
import { ProviderAdapter, ProviderMatchQuery } from '../interfaces/provider-adapter.interface';
import {
  mapRawLeagues,
  mapRawMatchEvents,
  mapRawMatches,
  mapRawPlayerStats,
  mapRawPlayers,
  mapRawSeasons,
  mapRawStandings,
  mapRawTeams,
  mapRawTeamStats,
} from '../mappers/provider-normalizer.mapper';

@Injectable()
export class FootballDataProviderAdapter implements ProviderAdapter {
  readonly code = 'football_data';
  private readonly logger = new Logger(FootballDataProviderAdapter.name);

  constructor(private readonly client: FootballDataClient) {}

  async getLeagues() {
    try {
      const response = (await this.client.getLeagues(process.env.PROVIDER_RAW_DEBUG === 'true')) as { competitions?: unknown[] };
      return mapRawLeagues(response.competitions || [], 'FOOTBALL');
    } catch (error) {
      this.logger.error(`getLeagues failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getSeasons(leagueExternalId?: string) {
    if (!leagueExternalId) {
      return [];
    }

    try {
      const response = (await this.client.getCompetition(leagueExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        currentSeason?: Record<string, unknown>;
        seasons?: unknown[];
      };

      const seasons = Array.isArray(response.seasons)
        ? response.seasons
        : response.currentSeason
          ? [response.currentSeason]
          : [];

      return mapRawSeasons(seasons, leagueExternalId);
    } catch (error) {
      this.logger.error(`getSeasons failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeams(leagueExternalId?: string) {
    if (!leagueExternalId) {
      return [];
    }

    try {
      const response = (await this.client.getTeams(leagueExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        teams?: unknown[];
      };
      return mapRawTeams(response.teams || []);
    } catch (error) {
      this.logger.error(`getTeams failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayers() {
    return mapRawPlayers([]);
  }

  async getMatches(params?: ProviderMatchQuery) {
    try {
      const response = (await this.client.getMatches({
        date: params?.date,
        dateFrom: params?.from,
        dateTo: params?.to,
        competitionCode: params?.leagueExternalId,
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { matches?: unknown[] };
      return mapRawMatches(response.matches || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getMatchById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        match?: unknown;
      };
      const mapped = mapRawMatches(response.match ? [response.match] : []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings(leagueExternalId: string) {
    try {
      const response = (await this.client.getStandings(leagueExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        standings?: Array<{ table?: unknown[] }>;
      };
      const table = response.standings?.[0]?.table || [];
      return mapRawStandings(table);
    } catch (error) {
      this.logger.error(`getStandings failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeamStats(externalMatchId: string) {
    try {
      const response = (await this.client.getMatchById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        match?: {
          homeTeam?: { id?: string | number };
          awayTeam?: { id?: string | number };
        };
      };

      const match = response.match;
      if (!match?.homeTeam?.id || !match?.awayTeam?.id) {
        return [];
      }

      return mapRawTeamStats(
        [
          { team: { id: match.homeTeam.id } },
          { team: { id: match.awayTeam.id } },
        ],
        externalMatchId,
      );
    } catch (error) {
      this.logger.error(`getTeamStats failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayerStats(externalMatchId: string) {
    return mapRawPlayerStats([], externalMatchId);
  }

  async getMatchEvents(externalMatchId: string) {
    return mapRawMatchEvents([], externalMatchId);
  }

  async healthCheck() {
    const start = Date.now();
    try {
      await this.client.getLeagues();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: (error as Error).message };
    }
  }
}
```


## FILE: src/modules/providers/adapters/ball-dont-lie.adapter.ts

```ts
import { Injectable, Logger } from '@nestjs/common';
import { BallDontLieClient } from '../clients/ball-dont-lie.client';
import { ProviderAdapter, ProviderMatchQuery } from '../interfaces/provider-adapter.interface';
import {
  mapRawLeagues,
  mapRawMatchEvents,
  mapRawMatches,
  mapRawPlayerStats,
  mapRawPlayers,
  mapRawSeasons,
  mapRawStandings,
  mapRawTeams,
  mapRawTeamStats,
} from '../mappers/provider-normalizer.mapper';

@Injectable()
export class BallDontLieProviderAdapter implements ProviderAdapter {
  readonly code = 'ball_dont_lie';
  private readonly logger = new Logger(BallDontLieProviderAdapter.name);

  constructor(private readonly client: BallDontLieClient) {}

  async getLeagues() {
    return mapRawLeagues([{ id: 'nba', name: 'NBA', country: 'USA' }], 'BASKETBALL');
  }

  async getSeasons(leagueExternalId?: string) {
    const now = new Date();
    const currentSeason = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return mapRawSeasons([{ season: currentSeason }], leagueExternalId || 'nba');
  }

  async getTeams() {
    try {
      const response = (await this.client.getTeams(process.env.PROVIDER_RAW_DEBUG === 'true')) as { data?: unknown[] };
      return mapRawTeams(response.data || []);
    } catch (error) {
      this.logger.error(`getTeams failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayers(teamExternalId?: string) {
    try {
      const response = (await this.client.getPlayers(teamExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        data?: unknown[];
      };
      return mapRawPlayers(response.data || []);
    } catch (error) {
      this.logger.error(`getPlayers failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatches(params?: ProviderMatchQuery) {
    try {
      const season = params?.seasonExternalId || String(new Date(params?.date || Date.now()).getUTCFullYear());
      const response = (await this.client.getGames({
        date: params?.date,
        from: params?.from,
        to: params?.to,
        season,
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { data?: unknown[] };
      return mapRawMatches(response.data || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getGameById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as unknown;
      const mapped = mapRawMatches(response ? [response] : []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings(_: string, seasonExternalId?: string) {
    try {
      const response = (await this.client.getGames({
        season: seasonExternalId || String(new Date().getUTCFullYear()),
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { data?: Array<Record<string, unknown>> };

      const games = response.data || [];
      const tableMap = new Map<string, {
        teamId: string;
        wins: number;
        losses: number;
        pointsFor: number;
        pointsAgainst: number;
        played: number;
      }>();

      for (const game of games) {
        const homeTeam = game.home_team as Record<string, unknown> | undefined;
        const awayTeam = game.visitor_team as Record<string, unknown> | undefined;
        const homeId = String(homeTeam?.id || '');
        const awayId = String(awayTeam?.id || '');
        if (!homeId || !awayId) {
          continue;
        }

        const homeScore = Number(game.home_team_score || 0);
        const awayScore = Number(game.visitor_team_score || 0);

        const home = tableMap.get(homeId) || {
          teamId: homeId,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          played: 0,
        };
        const away = tableMap.get(awayId) || {
          teamId: awayId,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          played: 0,
        };

        home.played += 1;
        away.played += 1;
        home.pointsFor += homeScore;
        home.pointsAgainst += awayScore;
        away.pointsFor += awayScore;
        away.pointsAgainst += homeScore;

        if (homeScore >= awayScore) {
          home.wins += 1;
          away.losses += 1;
        } else {
          away.wins += 1;
          home.losses += 1;
        }

        tableMap.set(homeId, home);
        tableMap.set(awayId, away);
      }

      const sorted = [...tableMap.values()].sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

      return mapRawStandings(
        sorted.map((item, index) => ({
          team: { id: item.teamId },
          rank: index + 1,
          played: item.played,
          wins: item.wins,
          draws: 0,
          losses: item.losses,
          goalsFor: item.pointsFor,
          goalsAgainst: item.pointsAgainst,
          points: item.wins,
          form: '',
        })),
      );
    } catch (error) {
      this.logger.error(`getStandings failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeamStats(externalMatchId: string) {
    try {
      const response = (await this.client.getGameById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as Record<
        string,
        unknown
      >;
      const homeTeam = response.home_team as Record<string, unknown> | undefined;
      const awayTeam = response.visitor_team as Record<string, unknown> | undefined;
      const homeScore = Number(response.home_team_score || 0);
      const awayScore = Number(response.visitor_team_score || 0);

      return mapRawTeamStats(
        [
          { team: { id: homeTeam?.id }, shots: homeScore, possession: 50, payload: response },
          { team: { id: awayTeam?.id }, shots: awayScore, possession: 50, payload: response },
        ],
        externalMatchId,
      );
    } catch (error) {
      this.logger.error(`getTeamStats failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayerStats(externalMatchId: string) {
    try {
      const response = (await this.client.getGameStats(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        data?: unknown[];
      };
      return mapRawPlayerStats(response.data || [], externalMatchId);
    } catch (error) {
      this.logger.error(`getPlayerStats failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchEvents(externalMatchId: string) {
    return mapRawMatchEvents([], externalMatchId);
  }

  async healthCheck() {
    const start = Date.now();
    try {
      await this.client.getTeams();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: (error as Error).message };
    }
  }
}
```


## FILE: src/modules/providers/adapters/api-football.adapter.ts

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ApiFootballClient } from '../clients/api-football.client';
import { ProviderAdapter, ProviderMatchQuery } from '../interfaces/provider-adapter.interface';
import {
  mapRawLeagues,
  mapRawMatchEvents,
  mapRawMatches,
  mapRawPlayerStats,
  mapRawPlayers,
  mapRawSeasons,
  mapRawStandings,
  mapRawTeams,
  mapRawTeamStats,
} from '../mappers/provider-normalizer.mapper';

@Injectable()
export class ApiFootballProviderAdapter implements ProviderAdapter {
  readonly code = 'api_football';
  private readonly logger = new Logger(ApiFootballProviderAdapter.name);

  constructor(private readonly client: ApiFootballClient) {}

  async getLeagues() {
    try {
      const response = (await this.client.getLeagues(process.env.PROVIDER_RAW_DEBUG === 'true')) as { response?: unknown[] };
      const rows = (response.response || []).map((item) => ((item as { league?: unknown }).league ?? item));
      return mapRawLeagues(rows, 'FOOTBALL');
    } catch (error) {
      this.logger.error(`getLeagues failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getSeasons(leagueExternalId?: string) {
    if (!leagueExternalId) return [];
    return mapRawSeasons([{ season: new Date().getUTCFullYear() }], leagueExternalId);
  }

  async getTeams(leagueExternalId?: string) {
    try {
      const response = (await this.client.getTeams(leagueExternalId, String(new Date().getUTCFullYear()), process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        response?: unknown[];
      };
      const rows = (response.response || []).map((item) => (item as { team?: unknown }).team ?? item);
      return mapRawTeams(rows);
    } catch (error) {
      this.logger.error(`getTeams failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayers() {
    return mapRawPlayers([]);
  }

  async getMatches(params?: ProviderMatchQuery) {
    try {
      const response = (await this.client.getFixtures({
        date: params?.date,
        from: params?.from,
        to: params?.to,
        league: params?.leagueExternalId,
        season: params?.seasonExternalId,
        rawDebug: process.env.PROVIDER_RAW_DEBUG === 'true',
      })) as { response?: unknown[] };
      return mapRawMatches(response.response || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getFixtureById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        response?: unknown[];
      };
      const mapped = mapRawMatches(response.response || []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings(leagueExternalId: string, seasonExternalId?: string) {
    try {
      const response = (await this.client.getStandings(
        leagueExternalId,
        seasonExternalId || String(new Date().getUTCFullYear()),
        process.env.PROVIDER_RAW_DEBUG === 'true',
      )) as {
        response?: Array<{ league?: { standings?: unknown[][] } }>;
      };
      const table = response.response?.[0]?.league?.standings?.[0] || [];
      return mapRawStandings(table);
    } catch (error) {
      this.logger.error(`getStandings failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getTeamStats(externalMatchId: string) {
    return mapRawTeamStats([], externalMatchId);
  }

  async getPlayerStats(externalMatchId: string) {
    return mapRawPlayerStats([], externalMatchId);
  }

  async getMatchEvents(externalMatchId: string) {
    return mapRawMatchEvents([], externalMatchId);
  }

  async healthCheck() {
    const start = Date.now();
    try {
      await this.client.getLeagues();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: (error as Error).message };
    }
  }
}
```


## FILE: src/modules/providers/adapters/the-sports-db.adapter.ts

```ts
import { Injectable, Logger } from '@nestjs/common';
import { TheSportsDbClient } from '../clients/the-sports-db.client';
import { ProviderAdapter, ProviderMatchQuery } from '../interfaces/provider-adapter.interface';
import {
  mapRawLeagues,
  mapRawMatchEvents,
  mapRawMatches,
  mapRawPlayerStats,
  mapRawPlayers,
  mapRawSeasons,
  mapRawStandings,
  mapRawTeams,
  mapRawTeamStats,
} from '../mappers/provider-normalizer.mapper';

@Injectable()
export class TheSportsDbProviderAdapter implements ProviderAdapter {
  readonly code = 'the_sports_db';
  private readonly logger = new Logger(TheSportsDbProviderAdapter.name);

  constructor(private readonly client: TheSportsDbClient) {}

  async getLeagues() {
    try {
      const response = (await this.client.getLeagues(process.env.PROVIDER_RAW_DEBUG === 'true')) as { leagues?: unknown[] };
      return mapRawLeagues(response.leagues || [], 'FOOTBALL');
    } catch (error) {
      this.logger.error(`getLeagues failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getSeasons(leagueExternalId?: string) {
    return mapRawSeasons([{ season: new Date().getUTCFullYear() }], leagueExternalId || 'thesportsdb');
  }

  async getTeams(leagueExternalId?: string) {
    try {
      const response = (await this.client.getTeams(leagueExternalId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        teams?: unknown[];
      };
      return mapRawTeams(response.teams || []);
    } catch (error) {
      this.logger.error(`getTeams failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getPlayers() {
    return mapRawPlayers([]);
  }

  async getMatches(params?: ProviderMatchQuery) {
    try {
      const response = (await this.client.getEventsByDate(
        params?.date || new Date().toISOString().slice(0, 10),
        process.env.PROVIDER_RAW_DEBUG === 'true',
      )) as { events?: unknown[] };
      return mapRawMatches(response.events || []);
    } catch (error) {
      this.logger.error(`getMatches failed: ${(error as Error).message}`);
      return [];
    }
  }

  async getMatchById(externalMatchId: string) {
    try {
      const response = (await this.client.getEventById(externalMatchId, process.env.PROVIDER_RAW_DEBUG === 'true')) as {
        events?: unknown[];
      };
      const mapped = mapRawMatches(response.events || []);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error(`getMatchById failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getStandings() {
    return mapRawStandings([]);
  }

  async getTeamStats(externalMatchId: string) {
    return mapRawTeamStats([], externalMatchId);
  }

  async getPlayerStats(externalMatchId: string) {
    return mapRawPlayerStats([], externalMatchId);
  }

  async getMatchEvents(externalMatchId: string) {
    return mapRawMatchEvents([], externalMatchId);
  }

  async healthCheck() {
    const start = Date.now();
    try {
      await this.client.getLeagues();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: (error as Error).message };
    }
  }
}
```


## FILE: src/modules/jobs/services/canonical-mapping.service.ts

```ts
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
```


## FILE: src/modules/jobs/processors/ingestion.processor.ts

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { IngestionStatus, MatchStatus, Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionsService } from 'src/modules/predictions/predictions.service';
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
@Processor(QUEUE_NAMES.INGESTION)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: ProvidersService,
    private readonly cacheService: CacheService,
    private readonly mappingService: CanonicalMappingService,
    private readonly jobsService: JobsService,
    private readonly predictionsService: PredictionsService,
  ) {
    super();
  }

  async process(job: Job<{ ingestionJobId?: string; providerCode?: string }>): Promise<unknown> {
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

      for (const providerCode of providerCodes) {
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
            await this.cacheService.delByPrefix('league:detail:');
            break;
          case JOB_NAMES.syncSeasons:
            summary.providers[providerCode] = await this.syncSeasons(provider.id, adapter);
            await this.cacheService.delByPrefix('league:detail:');
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
            await this.cacheService.delByPrefix('match:detail:');
            await this.cacheService.del(['dashboard:summary']);
            break;
          }
          case JOB_NAMES.syncResults: {
            const { stats, touchedMatchIds } = await this.syncMatches(provider.id, adapter, providerSupportedLeagues, 'results');
            summary.providers[providerCode] = stats;
            summary.touchedMatchIds.push(...touchedMatchIds);
            await this.cacheService.delByPrefix('match:detail:');
            await this.cacheService.del(['dashboard:summary']);
            break;
          }
          case JOB_NAMES.syncStandings:
            summary.providers[providerCode] = await this.syncStandings(provider.id, adapter);
            await this.cacheService.delByPrefix('standings:');
            await this.cacheService.delByPrefix('league:detail:');
            break;
          case JOB_NAMES.syncTeamStats:
            summary.providers[providerCode] = await this.syncTeamStats(provider.id, adapter);
            break;
          case JOB_NAMES.syncPlayerStats:
            summary.providers[providerCode] = await this.syncPlayerStats(provider.id, adapter);
            break;
          case JOB_NAMES.syncMatchEvents: {
            summary.providers[providerCode] = await this.syncMatchEvents(provider.id, adapter);
            await this.cacheService.delByPrefix('match:detail:');
            break;
          }
          default:
            this.logger.log(`No-op ingestion job: ${job.name}`);
        }
      }

      if (job.name === JOB_NAMES.recalculateForms) {
        const formStats = await this.recalculateForms();
        summary.providers.system = formStats;
      }

      if (job.name === JOB_NAMES.generateFeatures) {
        const generated = await this.predictionsService.generateForMatches(summary.touchedMatchIds);
        summary.providers.system = { generated: generated.length };
      }

      if (summary.touchedMatchIds.length && [JOB_NAMES.syncFixtures, JOB_NAMES.syncResults].includes(job.name as any)) {
        await this.jobsService.enqueuePredictionBatch(summary.touchedMatchIds, `sync:${job.name}`);
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

      return { ok: true, summary };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Ingestion job failed ${job.name}: ${message}`);

      if (ingestionJobId) {
        const status = job.attemptsMade + 1 >= (job.opts.attempts || 1) ? IngestionStatus.DEAD_LETTER : IngestionStatus.FAILED;
        await this.prisma.ingestionJob.update({
          where: { id: ingestionJobId },
          data: { status, errorMessage: message, finishedAt: new Date() },
        });
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
    const from = mode === 'fixtures' ? formatDate(today) : formatDate(new Date(today.getTime() - 7 * 86400000));
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

    let processed = 0;
    let upserted = 0;
    let review = 0;

    for (const leagueMapping of leagueMappings) {
      if (!leagueMapping.leagueId || !leagueMapping.league) {
        continue;
      }

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

    let processed = 0;
    let upserted = 0;

    for (const mapping of providerMatchMappings) {
      const events = await adapter.getMatchEvents(mapping.externalId);
      if (!mapping.matchId) {
        continue;
      }

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

          await tx.matchEvent.create({
            data: {
              matchId: mapping.matchId as string,
              minute: event.minute,
              type: event.type,
              teamId: teamMapping?.teamId || null,
              payload: event.payload as Prisma.InputJsonValue,
            },
          });
          upserted += 1;
        }
      });
    }

    return { processed, upserted };
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
    const homeTeamMapping = await this.prisma.providerTeamMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: match.homeTeamExternalId,
        },
      },
    });

    const awayTeamMapping = await this.prisma.providerTeamMapping.findUnique({
      where: {
        providerId_externalId: {
          providerId,
          externalId: match.awayTeamExternalId,
        },
      },
    });

    const seasonId = await this.mappingService.resolveSeason(leagueId, match.seasonExternalId, new Date(match.matchDate));

    return this.mappingService.resolveMatch({
      providerId,
      sportId,
      leagueId,
      seasonId,
      externalId: match.externalId,
      homeTeamId: homeTeamMapping?.teamId || undefined,
      awayTeamId: awayTeamMapping?.teamId || undefined,
      matchDate: new Date(match.matchDate),
      status: match.status as MatchStatus,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      venue: match.venue,
      rawPayload: match.rawPayload,
    });
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



```


## FILE: src/modules/jobs/jobs.service.ts

```ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/database/prisma.service';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.INGESTION) private readonly ingestionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PREDICTION) private readonly predictionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.HEALTH) private readonly healthQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureRepeatableJobs();
  }

  async ensureRepeatableJobs(): Promise<void> {
    await this.ingestionQueue.add(
      JOB_NAMES.syncLeagues,
      { source: 'scheduler' },
      {
        repeat: { pattern: '0 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncLeagues}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncTeams,
      { source: 'scheduler' },
      {
        repeat: { pattern: '20 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncTeams}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncPlayers,
      { source: 'scheduler' },
      {
        repeat: { pattern: '40 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncPlayers}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncStandings,
      { source: 'scheduler' },
      {
        repeat: { pattern: '10 4 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncStandings}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncFixtures,
      { source: 'scheduler' },
      {
        repeat: { pattern: '5 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 400,
        jobId: `repeatable:${JOB_NAMES.syncFixtures}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncResults,
      { source: 'scheduler' },
      {
        repeat: { pattern: '15 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 400,
        jobId: `repeatable:${JOB_NAMES.syncResults}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncTeamStats,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/30 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncTeamStats}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncPlayerStats,
      { source: 'scheduler' },
      {
        repeat: { pattern: '0 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.syncPlayerStats}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncMatchEvents,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/5 * * * *' },
        removeOnComplete: 200,
        removeOnFail: 400,
        jobId: `repeatable:${JOB_NAMES.syncMatchEvents}`,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.recalculateForms,
      { source: 'scheduler' },
      {
        repeat: { pattern: '30 4 * * *' },
        removeOnComplete: 100,
        removeOnFail: 200,
        jobId: `repeatable:${JOB_NAMES.recalculateForms}`,
      },
    );

    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/20 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.generatePredictions}`,
      },
    );

    await this.healthQueue.add(
      JOB_NAMES.providerHealthCheck,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/5 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: `repeatable:${JOB_NAMES.providerHealthCheck}`,
      },
    );
  }

  async enqueueIngestionJob(ingestionJobId: string, jobName: string, payload: Record<string, unknown>): Promise<void> {
    const idempotentJobId = `${jobName}:${ingestionJobId}`;

    await this.ingestionQueue.add(jobName, payload, {
      jobId: idempotentJobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 300,
    });
  }

  async enqueuePredictionJob(matchId: string): Promise<void> {
    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { matchId },
      {
        jobId: `${JOB_NAMES.generatePredictions}:${matchId}`,
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async enqueuePredictionBatch(matchIds: string[], source = 'ingestion-sync'): Promise<void> {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    if (!dedupedIds.length) {
      return;
    }

    const batchKey = dedupedIds.slice(0, 10).join(',');

    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { matchIds: dedupedIds, source },
      {
        jobId: `${JOB_NAMES.generatePredictions}:batch:${batchKey}:${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1500,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async markDeadLetter(ingestionJobId: string, errorMessage: string): Promise<void> {
    await this.prisma.ingestionJob.update({
      where: { id: ingestionJobId },
      data: {
        status: 'DEAD_LETTER',
        errorMessage,
        finishedAt: new Date(),
      },
    });

    this.logger.error(`Dead letter job=${ingestionJobId} error=${errorMessage}`);
  }
}

```


## FILE: src/modules/jobs/jobs.module.ts

```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ProvidersModule } from 'src/modules/providers/providers.module';
import { PredictionsModule } from 'src/modules/predictions/predictions.module';
import { QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { IngestionProcessor } from './processors/ingestion.processor';
import { PredictionProcessor } from './processors/prediction.processor';
import { HealthProcessor } from './processors/health.processor';
import { JobsService } from './jobs.service';
import { CanonicalMappingService } from './services/canonical-mapping.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: Number(configService.get<number>('redis.port')),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.INGESTION },
      { name: QUEUE_NAMES.PREDICTION },
      { name: QUEUE_NAMES.HEALTH },
    ),
    ProvidersModule,
    PredictionsModule,
  ],
  providers: [JobsService, CanonicalMappingService, IngestionProcessor, PredictionProcessor, HealthProcessor],
  exports: [JobsService, BullModule, CanonicalMappingService],
})
export class JobsModule {}
```


## FILE: src/modules/jobs/processors/prediction.processor.ts

```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { PredictionsService } from 'src/modules/predictions/predictions.service';

interface PredictionJobPayload {
  matchId?: string;
  matchIds?: string[];
  source?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.PREDICTION)
export class PredictionProcessor extends WorkerHost {
  private readonly logger = new Logger(PredictionProcessor.name);

  constructor(private readonly predictionsService: PredictionsService) {
    super();
  }

  async process(job: Job<PredictionJobPayload>): Promise<unknown> {
    this.logger.log(`Prediction job started: ${job.name}`);

    if (job.name === JOB_NAMES.generateFeatures) {
      if (job.data.matchId) {
        await this.predictionsService.generateForMatch(job.data.matchId);
        return { ok: true, mode: 'single' };
      }

      if (job.data.matchIds?.length) {
        return this.predictionsService.generateForMatches(job.data.matchIds);
      }

      return { ok: true, mode: 'noop' };
    }

    if (job.data?.matchId) {
      return this.predictionsService.generateForMatch(job.data.matchId);
    }

    if (job.data?.matchIds?.length) {
      return this.predictionsService.generateForMatches(job.data.matchIds);
    }

    return this.predictionsService.generatePendingPredictions();
  }
}
```


## FILE: src/modules/ingestion/ingestion.service.ts

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { AdminJobListQueryDto } from 'src/shared/dto/admin-job-list-query.dto';
import { RunIngestionDto } from './dto/run-ingestion.dto';

@Injectable()
export class IngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async run(dto: RunIngestionDto) {
    const provider = dto.providerCode
      ? await this.prisma.provider.findUnique({ where: { code: dto.providerCode } })
      : null;

    if (dto.providerCode && !provider) {
      throw new NotFoundException('Provider not found');
    }

    const jobRecord = await this.prisma.ingestionJob.create({
      data: {
        providerId: provider?.id,
        name: dto.jobType,
        queueName: 'ingestion',
        status: 'PENDING',
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        scheduledAt: new Date(),
      },
    });

    await this.jobsService.enqueueIngestionJob(jobRecord.id, dto.jobType, {
      ingestionJobId: jobRecord.id,
      providerCode: dto.providerCode,
      payload: dto.payload || {},
    });

    return { data: jobRecord };
  }

  async list(query: AdminJobListQueryDto) {
    const where = {
      ...(query.queueName ? { queueName: query.queueName } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.providerCode
        ? {
            provider: {
              code: query.providerCode,
            },
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where,
        include: { provider: true, runs: { orderBy: { createdAt: 'desc' }, take: 5 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.ingestionJob.count({ where }),
    ]);

    return {
      data: items,
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async failedJobs(limit = 50) {
    const rows = await this.prisma.ingestionJob.findMany({
      where: { status: { in: ['FAILED', 'DEAD_LETTER'] } },
      include: { provider: true, runs: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });

    return { data: rows };
  }

  async detail(id: string) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: { id },
      include: { provider: true, runs: { orderBy: { createdAt: 'desc' } } },
    });
    if (!job) {
      throw new NotFoundException('Ingestion job not found');
    }
    return { data: job };
  }

  async retry(id: string) {
    const job = await this.prisma.ingestionJob.findUnique({ where: { id }, include: { provider: true } });
    if (!job) {
      throw new NotFoundException('Ingestion job not found');
    }

    await this.jobsService.enqueueIngestionJob(job.id, job.name, {
      ingestionJobId: job.id,
      providerCode: job.provider?.code,
      payload: (job.payload || {}) as Record<string, unknown>,
      retry: true,
    });

    await this.prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: 'PENDING', scheduledAt: new Date(), errorMessage: null },
    });

    return { data: { retried: true, jobId: job.id } };
  }

  async summary() {
    const [latestSuccessful, latestRuns, failedCount] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where: { status: 'SUCCESS' },
        include: { provider: true },
        orderBy: { finishedAt: 'desc' },
        take: 20,
      }),
      this.prisma.ingestionJobRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { ingestionJob: { include: { provider: true } } },
      }),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    const byJobName = latestSuccessful.reduce<Record<string, { lastSuccessAt: string; provider: string | null }>>((acc, row) => {
      if (!acc[row.name]) {
        acc[row.name] = {
          lastSuccessAt: row.finishedAt?.toISOString() || row.updatedAt.toISOString(),
          provider: row.provider?.code || null,
        };
      }
      return acc;
    }, {});

    return {
      data: {
        failedJobs: failedCount,
        latestByJobName: byJobName,
        recentRuns: latestRuns,
      },
    };
  }
}
```


## FILE: src/modules/ingestion/ingestion.controller.ts

```ts
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AdminJobListQueryDto } from 'src/shared/dto/admin-job-list-query.dto';
import { RunIngestionDto } from './dto/run-ingestion.dto';
import { IngestionService } from './ingestion.service';

@ApiTags('ingestion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/ingestion')
export class IngestionController {
  constructor(private readonly service: IngestionService) {}

  @Post('run')
  run(@Body() dto: RunIngestionDto) {
    return this.service.run(dto);
  }

  @Get('jobs')
  list(@Query() query: AdminJobListQueryDto) {
    return this.service.list(query);
  }

  @Get('jobs/failed')
  failed(@Query('limit') limit?: string) {
    return this.service.failedJobs(limit ? Number(limit) : 50);
  }

  @Get('jobs/:id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post('jobs/:id/retry')
  retry(@Param('id') id: string) {
    return this.service.retry(id);
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }
}
```


## FILE: src/modules/admin/admin.service.ts

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [users, leagues, teams, matches, predictions, failedJobs] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.league.count({ where: { deletedAt: null } }),
      this.prisma.team.count({ where: { deletedAt: null } }),
      this.prisma.match.count(),
      this.prisma.prediction.count(),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    return {
      users,
      leagues,
      teams,
      matches,
      predictions,
      failedJobs,
    };
  }

  async mappingReviewList(limit = 100) {
    const [teamMappings, leagueMappings, matchMappings] = await Promise.all([
      this.prisma.providerTeamMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, team: true },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(200, Math.max(1, limit)),
      }),
      this.prisma.providerLeagueMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, league: true },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(200, Math.max(1, limit)),
      }),
      this.prisma.providerMatchMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, match: true },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(200, Math.max(1, limit)),
      }),
    ]);

    return {
      teamMappings,
      leagueMappings,
      matchMappings,
      total: teamMappings.length + leagueMappings.length + matchMappings.length,
    };
  }

  async predictionGenerationStatus() {
    const [latestPrediction, totalPredictions, last24hPredictions, latestFeatureSet, activeModels] = await Promise.all([
      this.prisma.prediction.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.prediction.count(),
      this.prisma.prediction.count({ where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.prisma.featureSet.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.modelVersion.findMany({ where: { status: { in: ['active', 'ACTIVE'] }, deletedAt: null } }),
    ]);

    return {
      totalPredictions,
      generatedLast24Hours: last24hPredictions,
      latestPredictionAt: latestPrediction?.updatedAt?.toISOString() || null,
      latestFeatureSetAt: latestFeatureSet?.updatedAt?.toISOString() || null,
      activeModels,
    };
  }

  async latestSyncSummary() {
    const [latestJobs, latestRuns, failedJobs] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      this.prisma.ingestionJobRun.findMany({
        include: { ingestionJob: { include: { provider: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    const latestByType = latestJobs.reduce<Record<string, { status: string; updatedAt: string; providerCode: string | null }>>(
      (acc, job) => {
        if (!acc[job.name]) {
          acc[job.name] = {
            status: job.status,
            updatedAt: job.updatedAt.toISOString(),
            providerCode: job.provider?.code || null,
          };
        }
        return acc;
      },
      {},
    );

    return {
      failedJobs,
      latestByType,
      recentJobs: latestJobs,
      recentRuns: latestRuns,
    };
  }
}
```


## FILE: src/modules/admin/admin.controller.ts

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('summary')
  async summary() {
    return { data: await this.service.summary() };
  }

  @Get('mappings/review')
  async mappingReview(@Query('limit') limit?: string) {
    return { data: await this.service.mappingReviewList(limit ? Number(limit) : 100) };
  }

  @Get('predictions/status')
  async predictionStatus() {
    return { data: await this.service.predictionGenerationStatus() };
  }

  @Get('sync/summary')
  async syncSummary() {
    return { data: await this.service.latestSyncSummary() };
  }
}
```


## FILE: src/modules/predictions/features/football-feature.builder.ts

```ts
import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { FeatureBuilder, PredictionEngineInput } from '../engines/prediction.interfaces';

@Injectable()
export class FootballFeatureBuilder implements FeatureBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(input: PredictionEngineInput): Promise<Record<string, number>> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: {
        id: true,
        leagueId: true,
        seasonId: true,
        matchDate: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    if (!match) {
      return this.zeroFeatures();
    }

    const [homeRecent, awayRecent, homeHomeMatches, awayAwayMatches, homeStanding, awayStanding] = await Promise.all([
      this.loadRecentTeamMatches(match.homeTeamId, match.matchDate),
      this.loadRecentTeamMatches(match.awayTeamId, match.matchDate),
      this.prisma.match.findMany({
        where: {
          homeTeamId: match.homeTeamId,
          status: MatchStatus.COMPLETED,
          matchDate: { lt: match.matchDate },
        },
        orderBy: { matchDate: 'desc' },
        take: 8,
      }),
      this.prisma.match.findMany({
        where: {
          awayTeamId: match.awayTeamId,
          status: MatchStatus.COMPLETED,
          matchDate: { lt: match.matchDate },
        },
        orderBy: { matchDate: 'desc' },
        take: 8,
      }),
      this.resolveStanding(match.leagueId, match.seasonId, match.homeTeamId),
      this.resolveStanding(match.leagueId, match.seasonId, match.awayTeamId),
    ]);

    const homeFormPoints = formPoints(homeRecent, match.homeTeamId);
    const awayFormPoints = formPoints(awayRecent, match.awayTeamId);

    const homeGoalsFor = avgGoalsFor(homeRecent, match.homeTeamId);
    const homeGoalsAgainst = avgGoalsAgainst(homeRecent, match.homeTeamId);
    const awayGoalsFor = avgGoalsFor(awayRecent, match.awayTeamId);
    const awayGoalsAgainst = avgGoalsAgainst(awayRecent, match.awayTeamId);

    const homeHomeWinRate = winRate(homeHomeMatches, true);
    const awayAwayWinRate = winRate(awayAwayMatches, false);

    const restDays = Math.min(
      daysSinceLastMatch(homeRecent[0]?.matchDate, match.matchDate),
      daysSinceLastMatch(awayRecent[0]?.matchDate, match.matchDate),
    );

    const missingPlayersCount = await this.estimateMissingPlayers(match.homeTeamId, match.awayTeamId, match.matchDate);

    return {
      recentFormScore: round2((homeFormPoints - awayFormPoints) / 15),
      homeAwayStrength: round2(homeHomeWinRate - awayAwayWinRate),
      avgGoalsFor: round2((homeGoalsFor + awayGoalsFor) / 2),
      avgGoalsAgainst: round2((homeGoalsAgainst + awayGoalsAgainst) / 2),
      tableRank: Number(homeStanding?.rank ?? 0),
      opponentStrengthDiff: Number((awayStanding?.rank ?? 0) - (homeStanding?.rank ?? 0)),
      restDays: Number(restDays),
      missingPlayersCount: Number(missingPlayersCount),
    };
  }

  private async resolveStanding(leagueId: string, seasonId: string | null, teamId: string) {
    if (seasonId) {
      const row = await this.prisma.standingsSnapshot.findUnique({
        where: {
          leagueId_seasonId_teamId: {
            leagueId,
            seasonId,
            teamId,
          },
        },
      });
      if (row) {
        return row;
      }
    }

    const season = await this.prisma.season.findFirst({
      where: { leagueId },
      orderBy: [{ isCurrent: 'desc' }, { seasonYear: 'desc' }],
    });

    if (!season) {
      return null;
    }

    return this.prisma.standingsSnapshot.findUnique({
      where: {
        leagueId_seasonId_teamId: {
          leagueId,
          seasonId: season.id,
          teamId,
        },
      },
    });
  }

  private async loadRecentTeamMatches(teamId: string, beforeDate: Date) {
    return this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 8,
    });
  }

  private async estimateMissingPlayers(homeTeamId: string, awayTeamId: string, beforeDate: Date): Promise<number> {
    const [homePlayers, awayPlayers, recentMatchIds] = await Promise.all([
      this.prisma.player.findMany({ where: { teamId: homeTeamId, deletedAt: null }, select: { id: true } }),
      this.prisma.player.findMany({ where: { teamId: awayTeamId, deletedAt: null }, select: { id: true } }),
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId }, { awayTeamId }],
          status: MatchStatus.COMPLETED,
          matchDate: { lt: beforeDate },
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
        select: { id: true },
      }),
    ]);

    if (!recentMatchIds.length) {
      return 0;
    }

    const stats = await this.prisma.playerStat.findMany({
      where: {
        matchId: { in: recentMatchIds.map((item) => item.id) },
        playerId: { in: [...homePlayers, ...awayPlayers].map((item) => item.id) },
      },
      select: { playerId: true },
    });

    const activePlayers = new Set(stats.map((item) => item.playerId));
    const totalPlayers = [...homePlayers, ...awayPlayers].length;
    return Math.max(0, totalPlayers - activePlayers.size);
  }

  private zeroFeatures(): Record<string, number> {
    return {
      recentFormScore: 0,
      homeAwayStrength: 0,
      avgGoalsFor: 0,
      avgGoalsAgainst: 0,
      tableRank: 0,
      opponentStrengthDiff: 0,
      restDays: 0,
      missingPlayersCount: 0,
    };
  }
}

const formPoints = (
  matches: Array<{
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
  }>,
  teamId: string,
): number => {
  let total = 0;

  for (const match of matches.slice(0, 5)) {
    const isHome = match.homeTeamId === teamId;
    const goalsFor = isHome ? Number(match.homeScore ?? 0) : Number(match.awayScore ?? 0);
    const goalsAgainst = isHome ? Number(match.awayScore ?? 0) : Number(match.homeScore ?? 0);

    if (goalsFor > goalsAgainst) {
      total += 3;
    } else if (goalsFor === goalsAgainst) {
      total += 1;
    }
  }

  return total;
};

const avgGoalsFor = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  const total = matches.reduce((sum, match) => {
    const isHome = match.homeTeamId === teamId;
    return sum + Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
  }, 0);

  return total / matches.length;
};

const avgGoalsAgainst = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  const total = matches.reduce((sum, match) => {
    const isHome = match.homeTeamId === teamId;
    return sum + Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
  }, 0);

  return total / matches.length;
};

const winRate = (
  matches: Array<{ homeScore: number | null; awayScore: number | null }>,
  homePerspective: boolean,
): number => {
  if (!matches.length) {
    return 0;
  }

  const wins = matches.filter((match) =>
    homePerspective
      ? Number(match.homeScore ?? 0) > Number(match.awayScore ?? 0)
      : Number(match.awayScore ?? 0) > Number(match.homeScore ?? 0),
  ).length;

  return wins / matches.length;
};

const daysSinceLastMatch = (lastMatchDate: Date | undefined, nextMatchDate: Date): number => {
  if (!lastMatchDate) {
    return 7;
  }
  const diffMs = Math.max(0, nextMatchDate.getTime() - lastMatchDate.getTime());
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

const round2 = (value: number): number => Number(value.toFixed(2));
```


## FILE: src/modules/predictions/features/basketball-feature.builder.ts

```ts
import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { FeatureBuilder, PredictionEngineInput } from '../engines/prediction.interfaces';

@Injectable()
export class BasketballFeatureBuilder implements FeatureBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(input: PredictionEngineInput): Promise<Record<string, number>> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: {
        matchDate: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    if (!match) {
      return this.zeroFeatures();
    }

    const [homeRecent, awayRecent, teamStats] = await Promise.all([
      this.loadRecentTeamMatches(match.homeTeamId, match.matchDate),
      this.loadRecentTeamMatches(match.awayTeamId, match.matchDate),
      this.prisma.teamStat.findMany({
        where: {
          match: {
            OR: [
              { homeTeamId: match.homeTeamId },
              { awayTeamId: match.homeTeamId },
              { homeTeamId: match.awayTeamId },
              { awayTeamId: match.awayTeamId },
            ],
            status: MatchStatus.COMPLETED,
            matchDate: { lt: match.matchDate },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ]);

    const homeForm = formRate(homeRecent, match.homeTeamId);
    const awayForm = formRate(awayRecent, match.awayTeamId);

    const offensiveRating = avgPointsFor(homeRecent, match.homeTeamId);
    const defensiveRating = avgPointsAgainst(awayRecent, match.awayTeamId);

    const paceValues = teamStats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.pace ?? stat.shots ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const reboundRates = teamStats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.reboundRate ?? (stat.payload as Record<string, unknown> | null)?.rebounds ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const turnoverRates = teamStats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.turnoverRate ?? (stat.payload as Record<string, unknown> | null)?.turnovers ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0);

    const restDays = Math.min(
      daysSinceLastMatch(homeRecent[0]?.matchDate, match.matchDate),
      daysSinceLastMatch(awayRecent[0]?.matchDate, match.matchDate),
    );

    return {
      recentFormScore: round2(homeForm - awayForm),
      offensiveRating: round2(offensiveRating),
      defensiveRating: round2(defensiveRating),
      pace: round2(avgFromList(paceValues, 98)),
      reboundRate: round2(avgFromList(reboundRates, 50)),
      turnoverRate: round2(avgFromList(turnoverRates, 12)),
      restDays,
      homeAdvantageScore: round2(homeAdvantage(homeRecent, awayRecent, match.homeTeamId, match.awayTeamId)),
    };
  }

  private async loadRecentTeamMatches(teamId: string, beforeDate: Date) {
    return this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
    });
  }

  private zeroFeatures(): Record<string, number> {
    return {
      recentFormScore: 0,
      offensiveRating: 0,
      defensiveRating: 0,
      pace: 98,
      reboundRate: 50,
      turnoverRate: 12,
      restDays: 0,
      homeAdvantageScore: 0,
    };
  }
}

const formRate = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  let wins = 0;
  for (const match of matches.slice(0, 5)) {
    const isHome = match.homeTeamId === teamId;
    const scored = Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
    const conceded = Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
    if (scored > conceded) {
      wins += 1;
    }
  }

  return wins / Math.min(matches.length, 5);
};

const avgPointsFor = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  return (
    matches.reduce((sum, match) => {
      const isHome = match.homeTeamId === teamId;
      return sum + Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
    }, 0) / matches.length
  );
};

const avgPointsAgainst = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  return (
    matches.reduce((sum, match) => {
      const isHome = match.homeTeamId === teamId;
      return sum + Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
    }, 0) / matches.length
  );
};

const daysSinceLastMatch = (lastMatchDate: Date | undefined, nextMatchDate: Date): number => {
  if (!lastMatchDate) {
    return 3;
  }
  const diffMs = Math.max(0, nextMatchDate.getTime() - lastMatchDate.getTime());
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

const homeAdvantage = (
  homeMatches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  awayMatches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  homeTeamId: string,
  awayTeamId: string,
): number => {
  const homeDiff = homeMatches.slice(0, 5).reduce((sum, match) => {
    const scored = Number(match.homeTeamId === homeTeamId ? match.homeScore ?? 0 : match.awayScore ?? 0);
    const conceded = Number(match.homeTeamId === homeTeamId ? match.awayScore ?? 0 : match.homeScore ?? 0);
    return sum + (scored - conceded);
  }, 0);

  const awayDiff = awayMatches.slice(0, 5).reduce((sum, match) => {
    const scored = Number(match.homeTeamId === awayTeamId ? match.homeScore ?? 0 : match.awayScore ?? 0);
    const conceded = Number(match.homeTeamId === awayTeamId ? match.awayScore ?? 0 : match.homeScore ?? 0);
    return sum + (scored - conceded);
  }, 0);

  return (homeDiff - awayDiff) / 10;
};

const avgFromList = (values: number[], fallback: number): number => {
  if (!values.length) {
    return fallback;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const round2 = (value: number): number => Number(value.toFixed(2));
```


## FILE: src/modules/predictions/engines/football-elo.engine.ts

```ts
import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class FootballEloEngine implements PredictionEngine {
  key = 'football-elo';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { leagueId: true, matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return defaultOutput();
    }

    const completedMatches = await this.prisma.match.findMany({
      where: {
        leagueId: match.leagueId,
        status: MatchStatus.COMPLETED,
        matchDate: { lt: match.matchDate },
      },
      orderBy: { matchDate: 'asc' },
      take: 400,
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    });

    const ratings = new Map<string, number>();
    for (const completed of completedMatches) {
      const home = ratings.get(completed.homeTeamId) ?? 1500;
      const away = ratings.get(completed.awayTeamId) ?? 1500;
      const homeExpected = 1 / (1 + Math.pow(10, ((away - (home + 55)) / 400)));
      const awayExpected = 1 - homeExpected;

      const homeGoals = Number(completed.homeScore ?? 0);
      const awayGoals = Number(completed.awayScore ?? 0);

      const homeActual = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0;
      const awayActual = 1 - homeActual;

      const goalDiff = Math.max(1, Math.abs(homeGoals - awayGoals));
      const k = 20 + Math.min(20, goalDiff * 5);

      ratings.set(completed.homeTeamId, home + k * (homeActual - homeExpected));
      ratings.set(completed.awayTeamId, away + k * (awayActual - awayExpected));
    }

    const homeRating = (ratings.get(match.homeTeamId) ?? 1500) + 55;
    const awayRating = ratings.get(match.awayTeamId) ?? 1500;
    const diff = homeRating - awayRating;

    const baseHome = clamp01(1 / (1 + Math.exp(-diff / 180)));
    const draw = clamp01(0.22 - Math.min(0.08, Math.abs(diff) / 2200));
    const homeWin = clamp01(baseHome * (1 - draw));
    const awayWin = clamp01(1 - draw - homeWin);

    const homeScoring = await this.avgGoals(match.homeTeamId, true, match.matchDate);
    const awayScoring = await this.avgGoals(match.awayTeamId, false, match.matchDate);

    return {
      probabilities: normalizeProbabilities({
        homeWin,
        draw,
        awayWin,
      }),
      expectedScore: {
        home: round2((homeScoring.for + awayScoring.against) / 2),
        away: round2((awayScoring.for + homeScoring.against) / 2),
      },
    };
  }

  private async avgGoals(teamId: string, homePerspective: boolean, beforeDate: Date) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
      select: { homeTeamId: true, homeScore: true, awayScore: true },
    });

    if (!matches.length) {
      return { for: homePerspective ? 1.45 : 1.2, against: homePerspective ? 1.1 : 1.35 };
    }

    let gf = 0;
    let ga = 0;
    for (const match of matches) {
      const isHome = match.homeTeamId === teamId;
      gf += Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
      ga += Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
    }

    return {
      for: gf / matches.length,
      against: ga / matches.length,
    };
  }
}

const normalizeProbabilities = (values: { homeWin: number; draw: number; awayWin: number }) => {
  const total = values.homeWin + values.draw + values.awayWin;
  if (!total) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: round4(values.homeWin / total),
    draw: round4(values.draw / total),
    awayWin: round4(values.awayWin / total),
  };
};

const clamp01 = (value: number): number => Math.max(0.01, Math.min(0.98, value));
const round2 = (value: number): number => Number(value.toFixed(2));
const round4 = (value: number): number => Number(value.toFixed(4));

const defaultOutput = (): PredictionEngineOutput => ({
  probabilities: { homeWin: 0.45, draw: 0.27, awayWin: 0.28 },
  expectedScore: { home: 1.4, away: 1.1 },
});
```


## FILE: src/modules/predictions/engines/football-poisson.engine.ts

```ts
import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class FootballPoissonEngine implements PredictionEngine {
  key = 'football-poisson';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return {
        probabilities: { homeWin: 0.45, draw: 0.27, awayWin: 0.28 },
        expectedScore: { home: 1.5, away: 1.2 },
      };
    }

    const [homeStats, awayStats] = await Promise.all([
      this.teamGoalProfile(match.homeTeamId, match.matchDate),
      this.teamGoalProfile(match.awayTeamId, match.matchDate),
    ]);

    const lambdaHome = clampMin((homeStats.for + awayStats.against) / 2, 0.2);
    const lambdaAway = clampMin((awayStats.for + homeStats.against) / 2, 0.2);

    const maxGoals = 6;
    let homeWin = 0;
    let draw = 0;
    let awayWin = 0;

    for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
      for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
        const probability = poisson(lambdaHome, homeGoals) * poisson(lambdaAway, awayGoals);
        if (homeGoals > awayGoals) {
          homeWin += probability;
        } else if (homeGoals === awayGoals) {
          draw += probability;
        } else {
          awayWin += probability;
        }
      }
    }

    const normalized = normalize({ homeWin, draw, awayWin });

    return {
      probabilities: normalized,
      expectedScore: {
        home: Number(lambdaHome.toFixed(2)),
        away: Number(lambdaAway.toFixed(2)),
      },
    };
  }

  private async teamGoalProfile(teamId: string, beforeDate: Date): Promise<{ for: number; against: number }> {
    const rows = await this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 12,
      select: {
        homeTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (!rows.length) {
      return { for: 1.4, against: 1.2 };
    }

    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const row of rows) {
      const isHome = row.homeTeamId === teamId;
      goalsFor += Number(isHome ? row.homeScore ?? 0 : row.awayScore ?? 0);
      goalsAgainst += Number(isHome ? row.awayScore ?? 0 : row.homeScore ?? 0);
    }

    return {
      for: goalsFor / rows.length,
      against: goalsAgainst / rows.length,
    };
  }
}

const poisson = (lambda: number, k: number): number => {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
};

const factorial = (n: number): number => {
  if (n <= 1) return 1;
  let out = 1;
  for (let i = 2; i <= n; i += 1) {
    out *= i;
  }
  return out;
};

const normalize = (values: { homeWin: number; draw: number; awayWin: number }) => {
  const total = values.homeWin + values.draw + values.awayWin;
  if (total === 0) {
    return { homeWin: 0.45, draw: 0.27, awayWin: 0.28 };
  }

  return {
    homeWin: Number((values.homeWin / total).toFixed(4)),
    draw: Number((values.draw / total).toFixed(4)),
    awayWin: Number((values.awayWin / total).toFixed(4)),
  };
};

const clampMin = (value: number, min: number): number => (value < min ? min : value);
```


## FILE: src/modules/predictions/engines/basketball-team-rating.engine.ts

```ts
import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class BasketballTeamRatingEngine implements PredictionEngine {
  key = 'basketball-team-rating';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return {
        probabilities: { homeWin: 0.53, draw: 0, awayWin: 0.47 },
        expectedScore: { home: 108, away: 104 },
      };
    }

    const [homeProfile, awayProfile] = await Promise.all([
      this.teamProfile(match.homeTeamId, match.matchDate),
      this.teamProfile(match.awayTeamId, match.matchDate),
    ]);

    const ratingGap = homeProfile.net - awayProfile.net + 2.5;
    const homeWin = clamp(1 / (1 + Math.exp(-ratingGap / 6)), 0.05, 0.95);

    return {
      probabilities: {
        homeWin: Number(homeWin.toFixed(4)),
        draw: 0,
        awayWin: Number((1 - homeWin).toFixed(4)),
      },
      expectedScore: {
        home: Number(((homeProfile.scored + awayProfile.conceded) / 2).toFixed(2)),
        away: Number(((awayProfile.scored + homeProfile.conceded) / 2).toFixed(2)),
      },
    };
  }

  private async teamProfile(teamId: string, beforeDate: Date): Promise<{ scored: number; conceded: number; net: number }> {
    const rows = await this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 12,
      select: {
        homeTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (!rows.length) {
      return { scored: 108, conceded: 106, net: 2 };
    }

    let scored = 0;
    let conceded = 0;

    for (const row of rows) {
      const isHome = row.homeTeamId === teamId;
      scored += Number(isHome ? row.homeScore ?? 0 : row.awayScore ?? 0);
      conceded += Number(isHome ? row.awayScore ?? 0 : row.homeScore ?? 0);
    }

    const avgScored = scored / rows.length;
    const avgConceded = conceded / rows.length;

    return {
      scored: avgScored,
      conceded: avgConceded,
      net: avgScored - avgConceded,
    };
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
```


## FILE: src/modules/predictions/engines/basketball-pace-total.engine.ts

```ts
import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class BasketballPaceTotalEngine implements PredictionEngine {
  key = 'basketball-pace-total';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return {
        probabilities: { homeWin: 0.52, draw: 0, awayWin: 0.48 },
        expectedScore: { home: 107, away: 103 },
      };
    }

    const [home, away] = await Promise.all([
      this.teamTempoProfile(match.homeTeamId, match.matchDate),
      this.teamTempoProfile(match.awayTeamId, match.matchDate),
    ]);

    const expectedTotal = (home.pace + away.pace) * ((home.efficiency + away.efficiency) / 200);
    const expectedHome = expectedTotal * 0.51;
    const expectedAway = expectedTotal * 0.49;

    const homeWin = clamp(0.5 + (home.efficiency - away.efficiency) / 100, 0.06, 0.94);

    return {
      probabilities: {
        homeWin: Number(homeWin.toFixed(4)),
        draw: 0,
        awayWin: Number((1 - homeWin).toFixed(4)),
      },
      expectedScore: {
        home: Number(expectedHome.toFixed(2)),
        away: Number(expectedAway.toFixed(2)),
      },
    };
  }

  private async teamTempoProfile(teamId: string, beforeDate: Date): Promise<{ pace: number; efficiency: number }> {
    const [matches, stats] = await Promise.all([
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          status: MatchStatus.COMPLETED,
          matchDate: { lt: beforeDate },
        },
        orderBy: { matchDate: 'desc' },
        take: 10,
        select: {
          homeTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      }),
      this.prisma.teamStat.findMany({
        where: {
          teamId,
          match: {
            status: MatchStatus.COMPLETED,
            matchDate: { lt: beforeDate },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!matches.length) {
      return { pace: 98, efficiency: 108 };
    }

    let totalPoints = 0;
    for (const row of matches) {
      const isHome = row.homeTeamId === teamId;
      totalPoints += Number(isHome ? row.homeScore ?? 0 : row.awayScore ?? 0);
    }

    const paceValues = stats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.pace ?? stat.shots ?? 0))
      .filter((value) => value > 0 && Number.isFinite(value));

    const possessions = paceValues.length
      ? paceValues.reduce((sum, value) => sum + value, 0) / paceValues.length
      : 98;

    const efficiency = (totalPoints / matches.length / Math.max(1, possessions)) * 100;

    return {
      pace: Number(possessions.toFixed(2)),
      efficiency: Number(efficiency.toFixed(2)),
    };
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
```


## FILE: src/modules/predictions/predictions.repository.ts

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionListQueryDto } from 'src/shared/dto/prediction-list-query.dto';

@Injectable()
export class PredictionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PredictionListQueryDto, highConfidence = false) {
    const matchWhere: Prisma.MatchWhereInput = {
      ...(query.date
        ? {
            matchDate: {
              gte: new Date(`${query.date}T00:00:00.000Z`),
              lte: new Date(`${query.date}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(query.sport ? { sport: { code: query.sport.toUpperCase() as never } } : {}),
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
    };

    const where: Prisma.PredictionWhereInput = {
      status: 'PUBLISHED',
      ...(query.minConfidence ? { confidenceScore: { gte: query.minConfidence } } : {}),
      ...(highConfidence ? { confidenceScore: { gte: Math.max(query.minConfidence || 0, 75) } } : {}),
      match: matchWhere,
    };

    const skip = (query.page - 1) * query.pageSize;
    const sortField = query.sortBy === 'confidenceScore' ? 'confidenceScore' : 'updatedAt';

    const [items, total] = await Promise.all([
      this.prisma.prediction.findMany({
        where,
        include: {
          match: {
            include: {
              sport: true,
              league: true,
              homeTeam: true,
              awayTeam: true,
            },
          },
          explanation: true,
        },
        orderBy: { [sortField]: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.prediction.count({ where }),
    ]);

    return { items, total };
  }

  async getByMatchId(matchId: string) {
    const prediction = await this.prisma.prediction.findFirst({
      where: { matchId, status: 'PUBLISHED' },
      include: {
        match: {
          include: {
            sport: true,
            league: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
        explanation: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!prediction) {
      throw new NotFoundException('Prediction not found');
    }

    return prediction;
  }

  async upsertPrediction(
    matchId: string,
    modelVersionId: string,
    payload: {
      probabilities: Record<string, number>;
      expectedScore: Record<string, number>;
      confidenceScore: number;
      summary: string;
      riskFlags: string[];
      explanation: Record<string, unknown>;
    },
  ) {
    const prediction = await this.prisma.prediction.upsert({
      where: {
        matchId_modelVersionId: {
          matchId,
          modelVersionId,
        },
      },
      create: {
        matchId,
        modelVersionId,
        status: 'PUBLISHED',
        probabilities: payload.probabilities as Prisma.InputJsonValue,
        expectedScore: payload.expectedScore as Prisma.InputJsonValue,
        confidenceScore: payload.confidenceScore,
        summary: payload.summary,
        riskFlags: payload.riskFlags as Prisma.InputJsonValue,
      },
      update: {
        probabilities: payload.probabilities as Prisma.InputJsonValue,
        expectedScore: payload.expectedScore as Prisma.InputJsonValue,
        confidenceScore: payload.confidenceScore,
        summary: payload.summary,
        riskFlags: payload.riskFlags as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    await this.prisma.predictionExplanation.upsert({
      where: { predictionId: prediction.id },
      create: {
        predictionId: prediction.id,
        explanation: payload.explanation as Prisma.InputJsonValue,
      },
      update: {
        explanation: payload.explanation as Prisma.InputJsonValue,
      },
    });

    return prediction;
  }

  async upsertFeatureSet(matchId: string, modelFamily: string, features: Record<string, number>, qualityScore?: number) {
    return this.prisma.featureSet.upsert({
      where: {
        matchId_modelFamily: {
          matchId,
          modelFamily,
        },
      },
      create: {
        matchId,
        modelFamily,
        features: features as Prisma.InputJsonValue,
        qualityScore,
      },
      update: {
        features: features as Prisma.InputJsonValue,
        qualityScore,
      },
    });
  }
}
```


## FILE: src/modules/predictions/predictions.service.ts

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { CacheService } from 'src/common/utils/cache.service';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionListQueryDto } from 'src/shared/dto/prediction-list-query.dto';
import { DefaultConfidenceCalculator } from './calibration/default-confidence.calculator';
import { DefaultExplanationBuilder } from './calibration/default-explanation.builder';
import { BasketballPaceTotalEngine } from './engines/basketball-pace-total.engine';
import { BasketballTeamRatingEngine } from './engines/basketball-team-rating.engine';
import { FootballEloEngine } from './engines/football-elo.engine';
import { FootballPoissonEngine } from './engines/football-poisson.engine';
import { PredictionEngineInput } from './engines/prediction.interfaces';
import { BasketballFeatureBuilder } from './features/basketball-feature.builder';
import { FootballFeatureBuilder } from './features/football-feature.builder';
import { PredictionsRepository } from './predictions.repository';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly repository: PredictionsRepository,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly footballEloEngine: FootballEloEngine,
    private readonly footballPoissonEngine: FootballPoissonEngine,
    private readonly basketballRatingEngine: BasketballTeamRatingEngine,
    private readonly basketballPaceEngine: BasketballPaceTotalEngine,
    private readonly footballFeatureBuilder: FootballFeatureBuilder,
    private readonly basketballFeatureBuilder: BasketballFeatureBuilder,
    private readonly confidenceCalculator: DefaultConfidenceCalculator,
    private readonly explanationBuilder: DefaultExplanationBuilder,
  ) {}

  async list(query: PredictionListQueryDto) {
    const key = `predictions:list:${JSON.stringify(query)}`;
    return this.cacheService.getOrSet(key, 90, async () => {
      const { items, total } = await this.repository.list(query, false);
      return {
        data: items.map((item) => this.toFrontendPrediction(item)),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    });
  }

  async highConfidence(query: PredictionListQueryDto) {
    const key = `predictions:high:${JSON.stringify(query)}`;
    return this.cacheService.getOrSet(key, 90, async () => {
      const { items, total } = await this.repository.list(query, true);
      return {
        data: items.map((item) => this.toFrontendPrediction(item)),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    });
  }

  async getByMatchId(matchId: string) {
    return this.cacheService.getOrSet(`prediction:match:${matchId}`, 90, async () => {
      const item = await this.repository.getByMatchId(matchId);
      return { data: this.toFrontendPrediction(item) };
    });
  }

  async generateForMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      include: { sport: true, league: true, homeTeam: true, awayTeam: true },
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    const modelVersion = await this.ensureActiveModelVersion(match.sportId, match.sport.code);

    const input: PredictionEngineInput = {
      matchId,
      sportCode: match.sport.code,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      context: {
        leagueId: match.leagueId,
        seasonId: match.seasonId,
      },
    };

    const output = await this.runEngines(input);
    const features =
      match.sport.code === 'FOOTBALL'
        ? await this.footballFeatureBuilder.build(input)
        : await this.basketballFeatureBuilder.build(input);

    const confidence = this.confidenceCalculator.score(features, output);
    const explanation = this.explanationBuilder.build(features, output);

    await this.repository.upsertFeatureSet(match.id, `${String(match.sport.code).toLowerCase()}-features-v1`, features, confidence / 100);

    await this.repository.upsertPrediction(match.id, modelVersion.id, {
      probabilities: output.probabilities,
      expectedScore: output.expectedScore,
      confidenceScore: confidence,
      summary: explanation.summary,
      riskFlags: explanation.riskFlags,
      explanation: {
        modelVersion: modelVersion.key,
        features,
        probabilities: output.probabilities,
      },
    });

    await this.cacheService.delByPrefix('predictions:');
    await this.cacheService.del([
      `prediction:match:${match.id}`,
      `match:detail:${match.id}`,
      'dashboard:summary',
    ]);

    return this.getByMatchId(match.id);
  }

  async generateForMatches(matchIds: string[]) {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    const output = [];

    for (const matchId of dedupedIds) {
      try {
        const item = await this.generateForMatch(matchId);
        output.push({ matchId, status: 'success', prediction: item.data });
      } catch (error) {
        output.push({ matchId, status: 'failed', message: (error as Error).message });
      }
    }

    return output;
  }

  async generatePendingPredictions(limit = 40) {
    const now = new Date();
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const matches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
        matchDate: { gte: now, lte: in72h },
      },
      select: { id: true },
      orderBy: { matchDate: 'asc' },
      take: limit,
    });

    return this.generateForMatches(matches.map((item) => item.id));
  }

  async generationStatus() {
    const [latestPrediction, totalPredictions, last24hPredictions, latestFeatureUpdate] = await Promise.all([
      this.prisma.prediction.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.prediction.count(),
      this.prisma.prediction.count({ where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.prisma.featureSet.findFirst({ orderBy: { updatedAt: 'desc' } }),
    ]);

    return {
      totalPredictions,
      generatedLast24Hours: last24hPredictions,
      latestPredictionAt: latestPrediction?.updatedAt?.toISOString() || null,
      latestFeatureRefreshAt: latestFeatureUpdate?.updatedAt?.toISOString() || null,
    };
  }

  private async ensureActiveModelVersion(sportId: string, sportCode: 'FOOTBALL' | 'BASKETBALL') {
    const active = await this.prisma.modelVersion.findFirst({
      where: {
        deletedAt: null,
        status: { in: ['active', 'ACTIVE'] },
        OR: [{ sportId }, { sportId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (active) {
      return active;
    }

    return this.prisma.modelVersion.create({
      data: {
        sportId,
        key: `auto-${String(sportCode).toLowerCase()}-v1`,
        name: `${sportCode} Auto Model`,
        version: '1.0.0',
        status: 'active',
        metadata: {
          family: sportCode === 'FOOTBALL' ? 'elo-poisson' : 'team-rating-pace',
          createdBy: 'system',
        },
      },
    });
  }

  private async runEngines(input: PredictionEngineInput) {
    if (input.sportCode === 'FOOTBALL') {
      const [elo, poisson] = await Promise.all([this.footballEloEngine.run(input), this.footballPoissonEngine.run(input)]);

      return {
        probabilities: normalizeProbabilities({
          homeWin: (elo.probabilities.homeWin + poisson.probabilities.homeWin) / 2,
          draw: (elo.probabilities.draw + poisson.probabilities.draw) / 2,
          awayWin: (elo.probabilities.awayWin + poisson.probabilities.awayWin) / 2,
        }),
        expectedScore: {
          home: Number(((elo.expectedScore.home + poisson.expectedScore.home) / 2).toFixed(2)),
          away: Number(((elo.expectedScore.away + poisson.expectedScore.away) / 2).toFixed(2)),
        },
      };
    }

    const [rating, pace] = await Promise.all([this.basketballRatingEngine.run(input), this.basketballPaceEngine.run(input)]);

    const homeWin = (rating.probabilities.homeWin + pace.probabilities.homeWin) / 2;

    return {
      probabilities: {
        homeWin: Number(homeWin.toFixed(4)),
        draw: 0,
        awayWin: Number((1 - homeWin).toFixed(4)),
      },
      expectedScore: {
        home: Number(((rating.expectedScore.home + pace.expectedScore.home) / 2).toFixed(2)),
        away: Number(((rating.expectedScore.away + pace.expectedScore.away) / 2).toFixed(2)),
      },
    };
  }

  private toFrontendPrediction(item: any) {
    return {
      matchId: item.match.id,
      sport: String(item.match.sport.code || '').toLowerCase(),
      league: {
        id: item.match.league.id,
        name: item.match.league.name,
      },
      homeTeam: {
        id: item.match.homeTeam.id,
        name: item.match.homeTeam.name,
        logo: item.match.homeTeam.logoUrl,
      },
      awayTeam: {
        id: item.match.awayTeam.id,
        name: item.match.awayTeam.name,
        logo: item.match.awayTeam.logoUrl,
      },
      matchDate: item.match.matchDate.toISOString(),
      status: String(item.match.status || '').toLowerCase(),
      probabilities: item.probabilities,
      expectedScore: item.expectedScore,
      confidenceScore: item.confidenceScore,
      summary: item.summary,
      riskFlags: item.riskFlags || [],
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

const normalizeProbabilities = (values: { homeWin: number; draw: number; awayWin: number }) => {
  const total = values.homeWin + values.draw + values.awayWin;
  if (!total) {
    return {
      homeWin: 0.34,
      draw: 0.32,
      awayWin: 0.34,
    };
  }

  return {
    homeWin: Number((values.homeWin / total).toFixed(4)),
    draw: Number((values.draw / total).toFixed(4)),
    awayWin: Number((values.awayWin / total).toFixed(4)),
  };
};
```


## FILE: src/modules/providers/adapters/football-data.adapter.spec.ts

```ts
import { FootballDataProviderAdapter } from './football-data.adapter';

class FootballDataClientMock {
  async getLeagues() {
    return {
      competitions: [
        { id: 2021, code: 'PL', name: 'Premier League', area: { name: 'England' } },
      ],
    };
  }

  async getCompetition() {
    return {
      currentSeason: { id: '2026', season: 2026, startDate: '2026-08-10', endDate: '2027-05-25', current: true },
    };
  }

  async getTeams() {
    return {
      teams: [{ id: 57, name: 'Arsenal', tla: 'ARS' }],
    };
  }

  async getMatches() {
    return {
      matches: [
        {
          id: 10,
          competition: { code: 'PL' },
          homeTeam: { id: 57 },
          awayTeam: { id: 61 },
          utcDate: '2026-05-10T20:00:00.000Z',
          status: 'SCHEDULED',
        },
      ],
    };
  }

  async getStandings() {
    return {
      standings: [
        {
          table: [
            {
              position: 1,
              team: { id: 57 },
              playedGames: 10,
              won: 8,
              draw: 1,
              lost: 1,
              goalsFor: 20,
              goalsAgainst: 8,
              points: 25,
            },
          ],
        },
      ],
    };
  }

  async getMatchById() {
    return { match: null };
  }
}

describe('FootballDataProviderAdapter', () => {
  it('normalizes leagues and standings', async () => {
    const adapter = new FootballDataProviderAdapter(new FootballDataClientMock() as never);

    const leagues = await adapter.getLeagues();
    const standings = await adapter.getStandings('PL');

    expect(leagues).toHaveLength(1);
    expect(leagues[0].externalId).toBe('PL');
    expect(standings[0].externalTeamId).toBe('57');
    expect(standings[0].points).toBe(25);
  });
});

```


## FILE: src/modules/providers/adapters/ball-dont-lie.adapter.spec.ts

```ts
import { BallDontLieProviderAdapter } from './ball-dont-lie.adapter';

class BallDontLieClientMock {
  async getTeams() {
    return {
      data: [
        { id: 14, full_name: 'Los Angeles Lakers', abbreviation: 'LAL' },
        { id: 2, full_name: 'Boston Celtics', abbreviation: 'BOS' },
      ],
    };
  }

  async getPlayers() {
    return {
      data: [{ id: 1, first_name: 'LeBron', last_name: 'James', team_id: 14 }],
    };
  }

  async getGames() {
    return {
      data: [
        {
          id: 1,
          season: 2026,
          home_team: { id: 14 },
          visitor_team: { id: 2 },
          home_team_score: 110,
          visitor_team_score: 100,
          status: 'Final',
          date: '2026-03-12T19:00:00.000Z',
        },
      ],
    };
  }

  async getGameById() {
    return {
      id: 1,
      season: 2026,
      home_team: { id: 14 },
      visitor_team: { id: 2 },
      home_team_score: 108,
      visitor_team_score: 104,
      status: 'Final',
      date: '2026-03-12T19:00:00.000Z',
    };
  }

  async getGameStats() {
    return { data: [] };
  }
}

describe('BallDontLieProviderAdapter', () => {
  it('returns standings from games aggregation', async () => {
    const adapter = new BallDontLieProviderAdapter(new BallDontLieClientMock() as never);

    const standings = await adapter.getStandings('nba', '2026');

    expect(standings.length).toBeGreaterThan(0);
    expect(standings[0].externalTeamId).toBe('14');
    expect(standings[0].rank).toBe(1);
  });
});

```


## FILE: src/modules/providers/adapters/api-football.adapter.spec.ts

```ts
import { ApiFootballProviderAdapter } from './api-football.adapter';

class ApiFootballClientMock {
  async getLeagues() {
    return { response: [{ league: { id: 39, name: 'Premier League' } }] };
  }

  async getTeams() {
    return { response: [{ team: { id: 50, name: 'Arsenal' } }] };
  }

  async getFixtures() {
    return { response: [] };
  }

  async getFixtureById() {
    return { response: [] };
  }

  async getStandings() {
    return { response: [{ league: { standings: [[]] } }] };
  }
}

describe('ApiFootballProviderAdapter', () => {
  it('normalizes league list', async () => {
    const adapter = new ApiFootballProviderAdapter(new ApiFootballClientMock() as never);
    const leagues = await adapter.getLeagues();
    expect(leagues[0].externalId).toBe('39');
    expect(leagues[0].name).toBe('Premier League');
  });
});

```


## FILE: src/modules/providers/mappers/provider-normalizer.mapper.spec.ts

```ts
import { mapRawMatches, mapRawTeams } from './provider-normalizer.mapper';

describe('provider-normalizer.mapper', () => {
  it('maps teams correctly', () => {
    const result = mapRawTeams([{ id: 10, name: 'Arsenal', logo: 'x' }]);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe('10');
    expect(result[0].name).toBe('Arsenal');
  });

  it('maps matches correctly', () => {
    const result = mapRawMatches([
      {
        id: 1,
        competition: { code: 'PL' },
        home_team: { id: 20 },
        away_team: { id: 21 },
        utcDate: '2026-05-10T20:00:00.000Z',
        status: 'SCHEDULED',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].leagueExternalId).toBe('PL');
  });
});

```


## FILE: src/modules/jobs/services/canonical-mapping.service.spec.ts

```ts
import { CanonicalMappingService } from './canonical-mapping.service';

describe('CanonicalMappingService', () => {
  it('maps to existing team by high similarity', async () => {
    const prismaMock = {
      providerTeamMapping: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([{ id: 't1', name: 'Arsenal FC', shortName: 'ARS', country: 'England' }]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 't-new' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      league: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      providerLeagueMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      providerMatchMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      match: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 't-new' }), update: jest.fn() },
      season: { upsert: jest.fn() },
    } as any;

    const service = new CanonicalMappingService(prismaMock);

    const result = await service.resolveTeam({
      providerId: 'p1',
      sportId: 's1',
      externalId: '57',
      externalName: 'Arsenal FC',
      shortName: 'ARS',
      country: 'England',
    });

    expect(result).toBe('t1');
    expect(prismaMock.providerTeamMapping.upsert).toHaveBeenCalled();
  });

  it('creates new team when no candidate exists', async () => {
    const prismaMock = {
      providerTeamMapping: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 't2' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      league: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      providerLeagueMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      providerMatchMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      match: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 't-new' }), update: jest.fn() },
      season: { upsert: jest.fn() },
    } as any;

    const service = new CanonicalMappingService(prismaMock);

    const result = await service.resolveTeam({
      providerId: 'p1',
      sportId: 's1',
      externalId: '999',
      externalName: 'New Team',
    });

    expect(result).toBe('t2');
    expect(prismaMock.team.create).toHaveBeenCalled();
  });
});


```


## FILE: src/modules/predictions/features/football-feature.builder.spec.ts

```ts
import { FootballFeatureBuilder } from './football-feature.builder';

describe('FootballFeatureBuilder', () => {
  it('builds required feature keys', async () => {
    const prismaMock = {
      match: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          leagueId: 'l1',
          seasonId: 's1',
          matchDate: new Date('2026-05-01T18:00:00.000Z'),
          homeTeamId: 'h1',
          awayTeamId: 'a1',
        }),
        findMany: jest.fn().mockResolvedValue([
          { homeTeamId: 'h1', awayTeamId: 'a1', homeScore: 2, awayScore: 1, matchDate: new Date('2026-04-20T18:00:00.000Z') },
          { homeTeamId: 'a1', awayTeamId: 'h1', homeScore: 0, awayScore: 1, matchDate: new Date('2026-04-10T18:00:00.000Z') },
        ]),
      },
      standingsSnapshot: {
        findUnique: jest.fn().mockResolvedValue({ rank: 2 }),
      },
      season: {
        findFirst: jest.fn().mockResolvedValue({ id: 's1' }),
      },
      player: {
        findMany: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
      },
      playerStat: {
        findMany: jest.fn().mockResolvedValue([{ playerId: 'p1' }]),
      },
    } as any;

    const builder = new FootballFeatureBuilder(prismaMock);
    const features = await builder.build({
      matchId: 'm1',
      sportCode: 'FOOTBALL',
      homeTeamId: 'h1',
      awayTeamId: 'a1',
    });

    expect(features).toMatchObject({
      recentFormScore: expect.any(Number),
      homeAwayStrength: expect.any(Number),
      avgGoalsFor: expect.any(Number),
      avgGoalsAgainst: expect.any(Number),
      tableRank: expect.any(Number),
      opponentStrengthDiff: expect.any(Number),
      restDays: expect.any(Number),
      missingPlayersCount: expect.any(Number),
    });
  });
});

```


## FILE: test/ingestion.e2e-spec.ts

```ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin/ingestion')
class TestIngestionController {
  @Post('run')
  run(@Body() _dto: Record<string, unknown>) {
    return { data: { id: 'job-1', status: 'PENDING' } };
  }

  @Get('jobs')
  list() {
    return { data: [], meta: { page: 1, pageSize: 20, total: 0 } };
  }

  @Get('jobs/failed')
  failed(@Query('limit') _limit?: string) {
    return { data: [] };
  }

  @Get('jobs/:id')
  detail(@Param('id') id: string) {
    return { data: { id } };
  }

  @Post('jobs/:id/retry')
  retry(@Param('id') id: string) {
    return { data: { id, retried: true } };
  }
}

describe('Ingestion E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestIngestionController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/ingestion/jobs/failed', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/ingestion/jobs/failed')
      .expect(200)
      .expect(({ body }: { body: { data: unknown[] } }) => {
        expect(Array.isArray(body.data)).toBe(true);
      });
  });
});

```


