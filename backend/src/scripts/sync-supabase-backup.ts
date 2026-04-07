import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SupabaseBackupService } from '../modules/backup/supabase-backup.service';

async function bootstrap() {
  const logger = new Logger('SupabaseBackupSyncScript');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const backupService = app.get(SupabaseBackupService);
    const result = await backupService.runFullSync({ source: 'cli' });
    console.log(JSON.stringify(result));
    logger.log(`Supabase backup sync finished with status=${result.status} tables=${result.tablesCopied} rows=${result.rowsCopied}`);
  } finally {
    await app.close();
  }
}

void bootstrap();
