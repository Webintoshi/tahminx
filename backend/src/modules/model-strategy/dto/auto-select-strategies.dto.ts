import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AutoSelectStrategiesDto {
  @IsOptional()
  @IsIn(['football', 'basketball'])
  sport?: 'football' | 'basketball';

  @IsOptional()
  @IsString()
  predictionType = 'matchOutcome';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  minSampleSize = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  lookbackDays = 90;
}
