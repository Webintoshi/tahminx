import { Controller, Get, Param } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin/models')
class TestAdminModelsController {
  @Get('comparison')
  comparison() {
    return {
      data: [{ modelVersionId: 'mv1', accuracy: 0.64, sampleSize: 120 }],
      meta: { page: 1, pageSize: 20, total: 1 },
    };
  }

  @Get('feature-importance')
  featureImportance() {
    return {
      data: [{ modelVersionId: 'mv1', sport: 'football', featureName: 'recentFormScore', importanceScore: 0.91 }],
      meta: null,
    };
  }

  @Get('performance-timeseries')
  performanceTimeseries() {
    return {
      data: [{ modelVersionId: 'mv1', date: '2026-04-05T00:00:00.000Z', accuracy: 0.61 }],
      meta: null,
    };
  }

  @Get('drift-summary')
  driftSummary() {
    return {
      data: {
        performanceDropDetected: true,
        confidenceDriftDetected: false,
        calibrationDriftDetected: true,
      },
      meta: null,
    };
  }
}

@Controller('api/v1/admin/predictions')
class TestAdminPredictionsController {
  @Get('failed')
  failed() {
    return {
      data: [{ id: 'fa-1', isHighConfidence: true, confidenceScore: 81 }],
      meta: { page: 1, pageSize: 20, total: 1 },
    };
  }

  @Get('failed/:id')
  failedDetail(@Param('id') id: string) {
    return { data: { id, summary: 'detail' } };
  }
}

describe('Admin Model Analysis Endpoints E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestAdminModelsController, TestAdminPredictionsController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/models/comparison', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/models/comparison')
      .expect(200)
      .expect(({ body }: { body: { data: Array<{ modelVersionId: string }>; meta: { total: number } } }) => {
        expect(body.data[0].modelVersionId).toBe('mv1');
        expect(body.meta.total).toBe(1);
      });
  });

  it('GET /api/v1/admin/models/feature-importance', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/models/feature-importance')
      .expect(200)
      .expect(({ body }: { body: { data: Array<{ featureName: string }> } }) => {
        expect(body.data[0].featureName).toBe('recentFormScore');
      });
  });

  it('GET /api/v1/admin/predictions/failed', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/predictions/failed')
      .expect(200)
      .expect(({ body }: { body: { data: Array<{ id: string }>; meta: { total: number } } }) => {
        expect(body.data[0].id).toBe('fa-1');
        expect(body.meta.total).toBe(1);
      });
  });

  it('GET /api/v1/admin/predictions/failed/:id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/predictions/failed/fa-1')
      .expect(200)
      .expect(({ body }: { body: { data: { id: string } } }) => {
        expect(body.data.id).toBe('fa-1');
      });
  });
});
