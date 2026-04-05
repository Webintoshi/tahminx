import { Module } from '@nestjs/common';
import { CalibrationController } from './calibration.controller';
import { PredictionCalibrationService } from './prediction-calibration.service';

@Module({
  controllers: [CalibrationController],
  providers: [PredictionCalibrationService],
  exports: [PredictionCalibrationService],
})
export class CalibrationModule {}
