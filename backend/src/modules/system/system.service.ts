import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PatchSystemSettingsDto } from './dto/update-system-setting.dto';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  settings() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async patchSettings(dto: PatchSystemSettingsDto) {
    const outputs = [];
    for (const setting of dto.settings) {
      const row = await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        create: {
          key: setting.key,
          value: setting.value as Prisma.InputJsonValue,
          description: setting.description,
          isPublic: setting.isPublic ?? false,
        },
        update: {
          value: setting.value as Prisma.InputJsonValue,
          description: setting.description,
          isPublic: setting.isPublic,
        },
      });
      outputs.push(row);
    }

    return outputs;
  }

  environmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      service: 'tahminx-backend',
      time: new Date().toISOString(),
      featureFlags: {
        liveEnabled: true,
        predictionsEnabled: true,
      },
    };
  }
}
