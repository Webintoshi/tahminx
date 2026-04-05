import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { MatchListQueryDto } from 'src/shared/dto/match-list-query.dto';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@Controller('api/v1/matches')
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List matches with frontend-compatible filtering' })
  list(@Query() query: MatchListQueryDto) { return this.service.list(query); }

  @Public()
  @Get('today')
  today() { return this.service.today(); }

  @Public()
  @Get('tomorrow')
  tomorrow() { return this.service.tomorrow(); }

  @Public()
  @Get('live')
  live() { return this.service.live(); }

  @Public()
  @Get('completed')
  completed() { return this.service.completed(); }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) { return this.service.detail(id); }

  @Public()
  @Get(':id/events')
  events(@Param('id') id: string) { return this.service.events(id); }

  @Public()
  @Get(':id/stats')
  stats(@Param('id') id: string) { return this.service.stats(id); }

  @Public()
  @Get(':id/prediction')
  prediction(@Param('id') id: string) { return this.service.prediction(id); }
}
