import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, SportCode } from '@prisma/client';

const CORE_SPORTS = [
  { code: SportCode.FOOTBALL, name: 'Football' },
  { code: SportCode.BASKETBALL, name: 'Basketball' },
] as const;

const CORE_PROVIDERS = [
  {
    code: 'football_data',
    name: 'Football Data',
    baseUrl: process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
    enabled: 'true',
    apiKey: process.env.FOOTBALL_DATA_API_KEY || 'change_me',
    isActive: true,
  },
  {
    code: 'ball_dont_lie',
    name: 'Ball Dont Lie',
    baseUrl: process.env.BALL_DONT_LIE_BASE_URL || 'https://api.balldontlie.io/v1',
    enabled: 'true',
    apiKey: process.env.BALL_DONT_LIE_API_KEY || 'change_me',
    isActive: true,
  },
  {
    code: 'api_football',
    name: 'API Football',
    baseUrl: process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
    enabled: 'false',
    apiKey: process.env.API_FOOTBALL_API_KEY || 'change_me',
    isActive: false,
  },
  {
    code: 'the_sports_db',
    name: 'The Sports DB',
    baseUrl: process.env.THE_SPORTS_DB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/3',
    enabled: 'false',
    apiKey: process.env.THE_SPORTS_DB_API_KEY || 'change_me',
    isActive: false,
  },
] as const;

const MODEL_STRATEGY_AND_FEATURE_LAB_BOOTSTRAP_SQL = [
  `ALTER TABLE "Prediction"
    ADD COLUMN IF NOT EXISTS "modelStrategyId" TEXT,
    ADD COLUMN IF NOT EXISTS "usedStrategy" JSONB;`,
  `CREATE TABLE IF NOT EXISTS "model_strategies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sport" TEXT NOT NULL,
    "leagueId" TEXT,
    "predictionType" TEXT NOT NULL,
    "primaryModelVersionId" TEXT NOT NULL,
    "fallbackModelVersionId" TEXT,
    "ensembleConfig" JSONB NOT NULL,
    "calibrationProfileId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "model_strategies_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "feature_lab_sets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sport" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "enabledFeatures" JSONB NOT NULL,
    "featureGroups" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    CONSTRAINT "feature_lab_sets_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "feature_lab_experiments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featureSetId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "leagueId" TEXT,
    "predictionType" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    CONSTRAINT "feature_lab_experiments_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "model_strategies_sport_leagueId_predictionType_key"
    ON "model_strategies"("sport", "leagueId", "predictionType");`,
  `CREATE INDEX IF NOT EXISTS "model_strategies_sport_isActive_predictionType_idx"
    ON "model_strategies"("sport", "isActive", "predictionType");`,
  `CREATE INDEX IF NOT EXISTS "model_strategies_leagueId_isActive_idx"
    ON "model_strategies"("leagueId", "isActive");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "feature_lab_sets_sport_name_version_key"
    ON "feature_lab_sets"("sport", "name", "version");`,
  `CREATE INDEX IF NOT EXISTS "feature_lab_sets_sport_isActive_idx"
    ON "feature_lab_sets"("sport", "isActive");`,
  `CREATE INDEX IF NOT EXISTS "feature_lab_experiments_featureSetId_createdAt_idx"
    ON "feature_lab_experiments"("featureSetId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "feature_lab_experiments_modelVersionId_createdAt_idx"
    ON "feature_lab_experiments"("modelVersionId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "feature_lab_experiments_sport_createdAt_idx"
    ON "feature_lab_experiments"("sport", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "Prediction_modelStrategyId_createdAt_idx"
    ON "Prediction"("modelStrategyId", "createdAt");`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prediction_modelStrategyId_fkey') THEN
      ALTER TABLE "Prediction"
        ADD CONSTRAINT "Prediction_modelStrategyId_fkey"
        FOREIGN KEY ("modelStrategyId") REFERENCES "model_strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_leagueId_fkey') THEN
      ALTER TABLE "model_strategies"
        ADD CONSTRAINT "model_strategies_leagueId_fkey"
        FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_primaryModelVersionId_fkey') THEN
      ALTER TABLE "model_strategies"
        ADD CONSTRAINT "model_strategies_primaryModelVersionId_fkey"
        FOREIGN KEY ("primaryModelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_fallbackModelVersionId_fkey') THEN
      ALTER TABLE "model_strategies"
        ADD CONSTRAINT "model_strategies_fallbackModelVersionId_fkey"
        FOREIGN KEY ("fallbackModelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'model_strategies_calibrationProfileId_fkey') THEN
      ALTER TABLE "model_strategies"
        ADD CONSTRAINT "model_strategies_calibrationProfileId_fkey"
        FOREIGN KEY ("calibrationProfileId") REFERENCES "prediction_calibrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_lab_experiments_featureSetId_fkey') THEN
      ALTER TABLE "feature_lab_experiments"
        ADD CONSTRAINT "feature_lab_experiments_featureSetId_fkey"
        FOREIGN KEY ("featureSetId") REFERENCES "feature_lab_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_lab_experiments_modelVersionId_fkey') THEN
      ALTER TABLE "feature_lab_experiments"
        ADD CONSTRAINT "feature_lab_experiments_modelVersionId_fkey"
        FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_lab_experiments_leagueId_fkey') THEN
      ALTER TABLE "feature_lab_experiments"
        ADD CONSTRAINT "feature_lab_experiments_leagueId_fkey"
        FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$;`,
] as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryMs = Math.max(20, Number(process.env.DB_SLOW_QUERY_MS || 250));

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    (this as any).$on('query', (event: any) => {
      const duration = Number(event.duration || 0);
      if (duration >= this.slowQueryMs) {
        const query = String(event.query || '').replace(/\s+/g, ' ').slice(0, 600);
        this.logger.warn(`slow_query durationMs=${duration} thresholdMs=${this.slowQueryMs} query="${query}"`);
      }
    });

    (this as any).$on('error', (event: any) => {
      this.logger.error(`prisma_error target=${event.target || 'unknown'} message=${event.message || 'unknown'}`);
    });

    await this.$connect();
    await this.ensureModelStrategyAndFeatureLabSchema();
    await this.ensureCoreReferenceData();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  private async ensureModelStrategyAndFeatureLabSchema(): Promise<void> {
    this.logger.log('Ensuring model strategy and feature lab schema bootstrap');
    for (const statement of MODEL_STRATEGY_AND_FEATURE_LAB_BOOTSTRAP_SQL) {
      await this.$executeRawUnsafe(statement);
    }
  }

  private async ensureCoreReferenceData(): Promise<void> {
    this.logger.log('Ensuring core sport/provider reference data');

    for (const sport of CORE_SPORTS) {
      await this.sport.upsert({
        where: { code: sport.code },
        create: {
          code: sport.code,
          name: sport.name,
          isActive: true,
        },
        update: {
          name: sport.name,
          isActive: true,
          deletedAt: null,
        },
      });
    }

    for (const provider of CORE_PROVIDERS) {
      const row = await this.provider.upsert({
        where: { code: provider.code },
        create: {
          code: provider.code,
          name: provider.name,
          baseUrl: provider.baseUrl,
          isActive: provider.isActive,
        },
        update: {
          name: provider.name,
          baseUrl: provider.baseUrl,
          isActive: provider.isActive,
          deletedAt: null,
        },
      });

      await this.providerConfig.upsert({
        where: {
          providerId_key: {
            providerId: row.id,
            key: 'enabled',
          },
        },
        create: {
          providerId: row.id,
          key: 'enabled',
          valueEncrypted: provider.enabled,
          isEnabled: true,
        },
        update: {
          valueEncrypted: provider.enabled,
          isEnabled: true,
        },
      });

      await this.providerConfig.upsert({
        where: {
          providerId_key: {
            providerId: row.id,
            key: 'apiKey',
          },
        },
        create: {
          providerId: row.id,
          key: 'apiKey',
          valueEncrypted: provider.apiKey,
          isEnabled: true,
        },
        update: {
          valueEncrypted: provider.apiKey,
          isEnabled: true,
        },
      });
    }
  }
}
