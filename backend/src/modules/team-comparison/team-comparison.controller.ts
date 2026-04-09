import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { TeamComparisonQueryDto } from './dto/team-comparison-query.dto';
import { TeamComparisonService } from './team-comparison.service';

@ApiTags('team-comparison')
@Controller('api/v1/compare')
export class TeamComparisonController {
  constructor(private readonly teamComparisonService: TeamComparisonService) {}

  @Public()
  @Get('teams')
  @ApiOperation({ summary: 'Compare two football teams using existing feature and prediction pipelines' })
  compareTeams(@Query() query: TeamComparisonQueryDto) {
    return this.teamComparisonService.compareTeams(query);
  }
}
