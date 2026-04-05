import { IsObject } from 'class-validator';

export class UpdateEnsembleConfigDto {
  @IsObject()
  ensembleConfig!: Record<string, unknown>;
}
