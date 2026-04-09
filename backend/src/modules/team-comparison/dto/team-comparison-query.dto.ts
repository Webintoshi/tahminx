import { IsIn, IsOptional, IsString } from 'class-validator';

const WINDOWS = ['last3', 'last5', 'last10'] as const;

export class TeamComparisonQueryDto {
  @IsString()
  homeTeamId!: string;

  @IsString()
  awayTeamId!: string;

  @IsOptional()
  @IsString()
  leagueId?: string;

  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsOptional()
  @IsIn(WINDOWS)
  window: (typeof WINDOWS)[number] = 'last5';
}
