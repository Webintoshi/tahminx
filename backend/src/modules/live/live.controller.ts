import { Controller, Get, Param, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { LiveService } from './live.service';

@ApiTags('live')
@Controller('api/v1/live')
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Public()
  @Get('matches')
  async matches() {
    return { data: await this.service.liveMatches() };
  }

  @Public()
  @Sse('events/stream')
  events() {
    return this.service.streamEvents();
  }

  @Public()
  @Sse('matches/:id/events/stream')
  matchEvents(@Param('id') id: string) {
    return this.service.streamEvents(id);
  }
}
