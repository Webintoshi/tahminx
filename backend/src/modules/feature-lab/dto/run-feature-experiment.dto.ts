import { IsIn, IsOptional, IsString } from 'class-validator';

export class RunFeatureExperimentDto {
  @IsString()
  featureSetId!: string;

  @IsString()
  modelVersionId!: string;

  @IsOptional()
  @IsIn(['football', 'basketball'])
  sport?: 'football' | 'basketball';

  @IsOptional()
  @IsString()
  leagueId?: string;

  @IsOptional()
  @IsString()
  predictionType = 'matchOutcome';

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

