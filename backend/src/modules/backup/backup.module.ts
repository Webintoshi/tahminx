import { Module } from '@nestjs/common';
import { SupabaseBackupService } from './supabase-backup.service';

@Module({
  providers: [SupabaseBackupService],
  exports: [SupabaseBackupService],
})
export class BackupModule {}
