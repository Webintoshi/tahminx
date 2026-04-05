import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { TeamListQueryDto } from 'src/shared/dto/team-list-query.dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@Controller('api/v1/teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List teams' })
  list(@Query() query: TeamListQueryDto) {
    return this.service.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Team detail with profile, form and squad' })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Public()
  @Get(':id/matches')
  teamMatches(@Param('id') id: string) {
    return this.service.teamMatches(id);
  }

  @Public()
  @Get(':id/form')
  teamForm(@Param('id') id: string) {
    return this.service.teamForm(id);
  }

  @Public()
  @Get(':id/squad')
  teamSquad(@Param('id') id: string) {
    return this.service.teamSquad(id);
  }
}
