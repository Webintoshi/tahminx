import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class AdminJobListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  queueName?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  providerCode?: string;
}
