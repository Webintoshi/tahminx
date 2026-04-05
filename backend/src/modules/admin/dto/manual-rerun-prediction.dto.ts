import { IsString } from 'class-validator';

export class ManualRerunPredictionDto {
  @IsString()
  matchId!: string;
}
