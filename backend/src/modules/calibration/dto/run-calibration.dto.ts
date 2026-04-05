import { IsIn, IsOptional, IsString } from 'class-validator';

export class RunCalibrationDto {
  @IsString()
  modelVersionId!: string;

  @IsOptional()
  @IsString()
  sport?: string;

  @IsOptional()
  @IsString()
  predictionType = 'matchOutcome1x2';

  @IsOptional()
  @IsIn(['platt', 'isotonic'])
  calibrationMethod = 'platt';
}
