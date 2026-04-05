import { Module } from '@nestjs/common';
import { ApiFootballProviderAdapter } from './adapters/api-football.adapter';
import { BallDontLieProviderAdapter } from './adapters/ball-dont-lie.adapter';
import { FootballDataProviderAdapter } from './adapters/football-data.adapter';
import { TheSportsDbProviderAdapter } from './adapters/the-sports-db.adapter';
import { ApiFootballClient } from './clients/api-football.client';
import { BallDontLieClient } from './clients/ball-dont-lie.client';
import { FootballDataClient } from './clients/football-data.client';
import { TheSportsDbClient } from './clients/the-sports-db.client';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    FootballDataClient,
    ApiFootballClient,
    BallDontLieClient,
    TheSportsDbClient,
    FootballDataProviderAdapter,
    ApiFootballProviderAdapter,
    BallDontLieProviderAdapter,
    TheSportsDbProviderAdapter,
  ],
  exports: [ProvidersService],
})
export class ProvidersModule {}
