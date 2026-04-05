import { IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto';

export class PredictionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  sport?: string;

  @IsOptional()
  @IsString()
  leagueId?: string;

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
  sortBy: string = 'confidenceScore';
}
