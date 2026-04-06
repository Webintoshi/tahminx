import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return value;
};

export class PredictionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  sport?: string;

  @IsOptional()
  @IsString()
  leagueId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsIn(['confidenceScore', 'updatedAt', 'createdAt', 'matchDate', 'kickoffAt'])
  sortBy: string = 'confidenceScore';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isLowConfidence?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isRecommended?: boolean;
}
