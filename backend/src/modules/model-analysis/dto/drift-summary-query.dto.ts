import { IsIn, IsOptional, IsString } from 'class-validator';

export class DriftSummaryQueryDto {
  @IsOptional()
  @IsString()
  modelVersionId?: string;

  @IsOptional()
  @IsIn(['football', 'basketball'])
  sport?: 'football' | 'basketball';

  @IsOptional()
  @IsString()
  leagueId?: string;
}
