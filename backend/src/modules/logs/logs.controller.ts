import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { LogsQueryDto } from './dto/logs-query.dto';
import { LogsService } from './logs.service';

@ApiTags('logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/logs')
export class LogsController {
  constructor(private readonly service: LogsService) {}

  @Get('audit')
  audit(@Query() query: LogsQueryDto) {
    return this.service.auditLogs(query);
  }

  @Get('api')
  api(@Query() query: LogsQueryDto) {
    return this.service.apiLogs(query);
  }

  @Get('ingestion')
  ingestion(@Query() query: LogsQueryDto) {
    return this.service.ingestionLogs(query);
  }
}
