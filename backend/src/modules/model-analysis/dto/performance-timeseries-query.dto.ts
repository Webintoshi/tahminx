import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PerformanceTimeseriesQueryDto {
  @IsOptional()
  @IsString()
  modelVersionId?: string;

  @IsOptional()
  @IsIn(['football', 'basketball'])
  sport?: 'football' | 'basketball';

  @IsOptional()
  @IsString()
  leagueId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  days = 37;
}
