import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/configuration';
import { validateEnv } from './config/env.schema';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RolesGuard } from './common/guards/roles.guard';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SportsModule } from './modules/sports/sports.module';
import { LeaguesModule } from './modules/leagues/leagues.module';
import { SeasonsModule } from './modules/seasons/seasons.module';
import { TeamsModule } from './modules/teams/teams.module';
import { PlayersModule } from './modules/players/players.module';
import { MatchesModule } from './modules/matches/matches.module';
import { StandingsModule } from './modules/standings/standings.module';
import { StatsModule } from './modules/stats/stats.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { ModelsModule } from './modules/models/models.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { LogsModule } from './modules/logs/logs.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LiveModule } from './modules/live/live.module';
import { SystemModule } from './modules/system/system.module';
import { BacktestModule } from './modules/backtest/backtest.module';
import { CalibrationModule } from './modules/calibration/calibration.module';
import { ModelStrategyModule } from './modules/model-strategy/model-strategy.module';
import { FeatureLabModule } from './modules/feature-lab/feature-lab.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { TeamComparisonModule } from './modules/team-comparison/team-comparison.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ApiLoggingMiddleware } from './common/logger/api-logging.middleware';
import { CorrelationIdMiddleware } from './common/logger/correlation-id.middleware';
import { SanitizeInputMiddleware } from './common/logger/sanitize-input.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig],
      cache: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    }),
    ThrottlerModule.forRoot([{ ttl: Number(process.env.THROTTLE_TTL || 60) * 1000, limit: Number(process.env.THROTTLE_LIMIT || 120) }]),
    CommonModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    SportsModule,
    LeaguesModule,
    SeasonsModule,
    TeamsModule,
    PlayersModule,
    MatchesModule,
    StandingsModule,
    StatsModule,
    PredictionsModule,
    ModelsModule,
    ProvidersModule,
    JobsModule,
    IngestionModule,
    AdminModule,
    HealthModule,
    LogsModule,
    AnalyticsModule,
    LiveModule,
    SystemModule,
    BacktestModule,
    CalibrationModule,
    ModelStrategyModule,
    FeatureLabModule,
    TeamComparisonModule,
    ArchiveModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, SanitizeInputMiddleware, ApiLoggingMiddleware).forRoutes('*');
  }
}
