import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateModelStrategyDto {
  @IsOptional()
  @IsString()
  primaryModelVersionId?: string;

  @IsOptional()
  @IsString()
  fallbackModelVersionId?: string | null;

  @IsOptional()
  @IsString()
  calibrationProfileId?: string | null;

  @IsOptional()
  @IsObject()
  ensembleConfig?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
