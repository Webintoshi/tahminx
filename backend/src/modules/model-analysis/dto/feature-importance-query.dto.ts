import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FeatureImportanceQueryDto {
  @IsOptional()
  @IsString()
  modelVersionId?: string;

  @IsOptional()
  @IsIn(['football', 'basketball'])
  sport?: 'football' | 'basketball';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 15;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lookbackDays = 45;
}
