import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ProvidersService } from './providers.service';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/providers')
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @Get('health')
  async health() {
    return { data: await this.service.health() };
  }

  @Get('logs')
  async logs(@Query('limit') limit?: string) {
    return { data: await this.service.logs(limit ? Number(limit) : 100) };
  }

  @Get('rate-limit')
  async rateLimitStatus() {
    return { data: await this.service.rateLimitStatus() };
  }

  @Get('configs')
  async configs() {
    const data = await this.service.health();
    return { data: data.providers.map((provider) => ({ code: provider.code, configs: provider.configs })) };
  }
}
