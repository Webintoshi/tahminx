import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('api/v1/stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Public()
  @Get('teams')
  async teamStats(@Query('teamId') teamId: string) {
    return { data: await this.service.teamStats(teamId) };
  }

  @Public()
  @Get('players')
  async playerStats(@Query('playerId') playerId: string) {
    return { data: await this.service.playerStats(playerId) };
  }

  @Public()
  @Get('matches/summary')
  async matchSummary(@Query('matchId') matchId: string) {
    return { data: await this.service.matchSummary(matchId) };
  }
}
