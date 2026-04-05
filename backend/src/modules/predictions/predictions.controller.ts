import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { PredictionListQueryDto } from 'src/shared/dto/prediction-list-query.dto';
import { PredictionsService } from './predictions.service';

@ApiTags('predictions')
@Controller('api/v1/predictions')
export class PredictionsController {
  constructor(private readonly service: PredictionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List predictions' })
  list(@Query() query: PredictionListQueryDto) {
    return this.service.list(query);
  }

  @Public()
  @Get('high-confidence')
  @ApiOperation({ summary: 'High confidence predictions' })
  highConfidence(@Query() query: PredictionListQueryDto) {
    return this.service.highConfidence(query);
  }
}
