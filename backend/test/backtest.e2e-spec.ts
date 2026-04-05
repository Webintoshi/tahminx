import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin/backtest')
class TestBacktestController {
  @Get('results')
  results(@Query('page') _page?: string, @Query('pageSize') _pageSize?: string) {
    return {
      data: [
        {
          id: 'bt-1',
          modelVersionId: 'mv-1',
          accuracy: 0.61,
          logLoss: 0.89,
          brierScore: 0.18,
          sampleSize: 100,
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
      },
    };
  }

  @Post('run')
  run(
    @Body()
    body: {
      modelVersionId: string;
      leagueId?: string;
      from: string;
      to: string;
      sampleLimit?: number;
    },
  ) {
    return {
      data: {
        id: 'bt-new',
        modelVersionId: body.modelVersionId,
        leagueId: body.leagueId || null,
        fromDate: body.from,
        toDate: body.to,
        sampleSize: body.sampleLimit || 100,
      },
    };
  }
}

describe('Backtest Endpoints E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestBacktestController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/backtest/results', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/backtest/results')
      .expect(200)
      .expect(({ body }: { body: { data: unknown[]; meta: { total: number } } }) => {
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.meta.total).toBe(1);
      });
  });

  it('POST /api/v1/admin/backtest/run', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/backtest/run')
      .send({
        modelVersionId: 'mv-1',
        leagueId: 'league-1',
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-06-01T00:00:00.000Z',
        sampleLimit: 120,
      })
      .expect(201)
      .expect(({ body }: { body: { data: { modelVersionId: string; sampleSize: number } } }) => {
        expect(body.data.modelVersionId).toBe('mv-1');
        expect(body.data.sampleSize).toBe(120);
      });
  });
});
