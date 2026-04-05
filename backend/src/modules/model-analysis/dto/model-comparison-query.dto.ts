import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ModelComparisonQueryDto {
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
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 20;
}
