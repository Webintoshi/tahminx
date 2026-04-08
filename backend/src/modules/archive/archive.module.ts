import { Module } from '@nestjs/common';
import { PredictionsModule } from 'src/modules/predictions/predictions.module';
import { ArchiveMaintenanceService } from './archive-maintenance.service';

@Module({
  imports: [PredictionsModule],
  providers: [ArchiveMaintenanceService],
  exports: [ArchiveMaintenanceService],
})
export class ArchiveModule {}
