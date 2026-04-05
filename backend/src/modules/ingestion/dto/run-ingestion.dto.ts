import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { JOB_NAMES } from 'src/shared/constants/jobs.constants';

export class RunIngestionDto {
  @ApiProperty({ enum: Object.values(JOB_NAMES) })
  @IsString()
  @IsIn(Object.values(JOB_NAMES))
  jobType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  providerCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
