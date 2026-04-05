import { Module } from '@nestjs/common';
import { ModelStrategyService } from './model-strategy.service';

@Module({
  providers: [ModelStrategyService],
  exports: [ModelStrategyService],
})
export class ModelStrategyModule {}
