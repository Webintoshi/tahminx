import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { StandingsService } from './standings.service';

@ApiTags('standings')
@Controller('api/v1/standings')
export class StandingsController {
  constructor(private readonly service: StandingsService) {}

  @Public()
  @Get()
  async list(@Query('leagueId') leagueId: string, @Query('seasonId') seasonId?: string) {
    return { data: await this.service.byLeague(leagueId, seasonId) };
  }

  @Public()
  @Get('form')
  async form(@Query('leagueId') leagueId: string, @Query('seasonId') seasonId?: string) {
    return { data: await this.service.formTable(leagueId, seasonId) };
  }

  @Public()
  @Get('summary')
  async summary(@Query('leagueId') leagueId: string, @Query('seasonId') seasonId?: string) {
    return { data: await this.service.summary(leagueId, seasonId) };
  }
}
