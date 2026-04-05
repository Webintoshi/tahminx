import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { LeagueListQueryDto } from 'src/shared/dto/league-list-query.dto';
import { LeaguesService } from './leagues.service';

@ApiTags('leagues')
@Controller('api/v1/leagues')
export class LeaguesController {
  constructor(private readonly service: LeaguesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List leagues' })
  list(@Query() query: LeagueListQueryDto) {
    return this.service.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'League detail with standings and summaries' })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Public()
  @Get(':id/standings')
  @ApiOperation({ summary: 'League standings' })
  standings(@Param('id') id: string) {
    return this.service.standings(id);
  }
}
