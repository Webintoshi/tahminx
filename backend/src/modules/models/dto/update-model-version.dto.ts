import { PartialType } from '@nestjs/swagger';
import { CreateModelVersionDto } from './create-model-version.dto';

export class UpdateModelVersionDto extends PartialType(CreateModelVersionDto) {}
