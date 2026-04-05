import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SeasonsService } from './seasons.service';

@ApiTags('seasons')
@Controller('api/v1/seasons')
export class SeasonsController {
  constructor(private readonly service: SeasonsService) {}

  @Public()
  @Get()
  async list(@Query('leagueId') leagueId: string) {
    return { data: await this.service.listByLeague(leagueId) };
  }
}
