import { Module } from '@nestjs/common';
import { FeatureLabController } from './feature-lab.controller';
import { FeatureLabService } from './feature-lab.service';

@Module({
  controllers: [FeatureLabController],
  providers: [FeatureLabService],
  exports: [FeatureLabService],
})
export class FeatureLabModule {}
