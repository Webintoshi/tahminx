import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SportsService } from './sports.service';

@ApiTags('sports')
@Controller('api/v1/sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List available sports' })
  list() {
    return this.sportsService.listSports();
  }
}
