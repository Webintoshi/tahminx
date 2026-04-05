import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { PlayersService } from './players.service';

@ApiTags('players')
@Controller('api/v1/players')
export class PlayersController {
  constructor(private readonly service: PlayersService) {}

  @Public()
  @Get()
  list(@Query() query: PaginationQueryDto, @Query('teamId') teamId?: string) {
    return this.service.list(query, teamId);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
