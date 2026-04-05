import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PatchSystemSettingsDto } from './dto/update-system-setting.dto';
import { SystemService } from './system.service';

@ApiTags('system')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/system')
export class SystemController {
  constructor(private readonly service: SystemService) {}

  @Get('settings')
  async settings() {
    return { data: await this.service.settings() };
  }

  @Patch('settings')
  async patchSettings(@Body() dto: PatchSystemSettingsDto) {
    return { data: await this.service.patchSettings(dto) };
  }

  @Get('environment')
  async environment() {
    return { data: await this.service.environmentInfo() };
  }
}
