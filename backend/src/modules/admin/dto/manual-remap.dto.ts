import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MappingType {
  TEAM = 'team',
  LEAGUE = 'league',
  MATCH = 'match',
}

export class ManualRemapDto {
  @IsEnum(MappingType)
  mappingType!: MappingType;

  @IsString()
  providerCode!: string;

  @IsString()
  externalId!: string;

  @IsString()
  canonicalId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
