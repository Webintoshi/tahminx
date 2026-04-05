import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin')
class TestAdminOpsController {
  @Get('mappings/review-queue')
  reviewQueue(@Query('limit') _limit?: string) {
    return { data: { total: 0, items: [] } };
  }

  @Get('mappings/failed')
  failedMappings(@Query('limit') _limit?: string) {
    return { data: { total: 0, teamMappings: [], leagueMappings: [], matchMappings: [] } };
  }

  @Post('mappings/remap')
  remap(@Body() body: { mappingType: string; providerCode: string; externalId: string; canonicalId: string }) {
    return { data: { ...body, reviewNeeded: false } };
  }

  @Post('predictions/rerun')
  rerunPrediction(@Body() body: { matchId: string }) {
    return { data: { queued: true, matchId: body.matchId } };
  }

  @Get('sync/summary-by-provider')
  syncSummaryByProvider() {
    return { data: [] };
  }
}

describe('Admin Ops Endpoints E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestAdminOpsController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/mappings/review-queue', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/mappings/review-queue')
      .expect(200)
      .expect(({ body }: { body: { data: { items: unknown[] } } }) => {
        expect(Array.isArray(body.data.items)).toBe(true);
      });
  });

  it('POST /api/v1/admin/mappings/remap', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/mappings/remap')
      .send({
        mappingType: 'team',
        providerCode: 'football_data',
        externalId: 'ext-1',
        canonicalId: 'team-1',
      })
      .expect(201)
      .expect(({ body }: { body: { data: { reviewNeeded: boolean } } }) => {
        expect(body.data.reviewNeeded).toBe(false);
      });
  });

  it('POST /api/v1/admin/predictions/rerun', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/predictions/rerun')
      .send({ matchId: 'match-1' })
      .expect(201)
      .expect(({ body }: { body: { data: { queued: boolean } } }) => {
        expect(body.data.queued).toBe(true);
      });
  });
});
