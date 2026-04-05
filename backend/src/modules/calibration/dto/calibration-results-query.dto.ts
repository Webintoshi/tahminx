import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

export class CalibrationResultsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  modelVersionId?: string;

  @IsOptional()
  @IsString()
  sport?: string;

  @IsOptional()
  @IsString()
  predictionType?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
