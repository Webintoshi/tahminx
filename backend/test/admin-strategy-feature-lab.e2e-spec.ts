import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin/models')
class TestModelStrategyController {
  @Get('strategies')
  strategies() {
    return {
      data: [{ id: 's1', sport: 'football', predictionType: 'matchOutcome' }],
      meta: { page: 1, pageSize: 20, total: 1 },
    };
  }

  @Post('strategies/auto-select')
  autoSelect() {
    return {
      data: [{ strategyId: 's1', switched: true }],
      meta: { total: 1 },
    };
  }

  @Patch('strategies/:id')
  updateStrategy(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return { data: { id, ...body }, meta: null };
  }

  @Get('ensemble-configs')
  ensembleConfigs() {
    return {
      data: [{ id: 's1', ensembleConfig: { method: 'weightedAverage', members: [] } }],
      meta: null,
    };
  }

  @Patch('ensemble-configs/:id')
  updateEnsembleConfig(@Param('id') id: string) {
    return { data: { id, updated: true }, meta: null };
  }
}

@Controller('api/v1/admin/features/lab')
class TestFeatureLabController {
  @Get()
  list() {
    return {
      data: [{ id: 'fs1', sport: 'football', name: 'core-football-template' }],
      meta: { page: 1, pageSize: 20, total: 1 },
    };
  }

  @Post('experiment')
  experiment() {
    return {
      data: { id: 'exp1', status: 'COMPLETED' },
      meta: null,
    };
  }

  @Get('results')
  results() {
    return {
      data: [{ id: 'exp1', sampleSize: 120 }],
      meta: { page: 1, pageSize: 20, total: 1 },
    };
  }
}

describe('Admin Strategy + Feature Lab E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestModelStrategyController, TestFeatureLabController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/models/strategies', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/models/strategies')
      .expect(200)
      .expect(({ body }: { body: { data: Array<{ id: string }>; meta: { total: number } } }) => {
        expect(body.data[0].id).toBe('s1');
        expect(body.meta.total).toBe(1);
      });
  });

  it('POST /api/v1/admin/models/strategies/auto-select', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/models/strategies/auto-select')
      .send({ predictionType: 'matchOutcome' })
      .expect(201)
      .expect(({ body }: { body: { data: Array<{ switched: boolean }> } }) => {
        expect(body.data[0].switched).toBe(true);
      });
  });

  it('GET /api/v1/admin/features/lab/results', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/features/lab/results')
      .expect(200)
      .expect(({ body }: { body: { data: Array<{ id: string }> } }) => {
        expect(body.data[0].id).toBe('exp1');
      });
  });
});
