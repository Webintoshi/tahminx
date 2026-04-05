import { Module } from '@nestjs/common';
import { PredictionsModule } from '../predictions/predictions.module';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';

@Module({
  imports: [PredictionsModule],
  controllers: [BacktestController],
  providers: [BacktestService],
})
export class BacktestModule {}
