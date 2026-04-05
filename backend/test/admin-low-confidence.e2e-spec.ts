import { Controller, Get } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin/predictions')
class TestAdminPredictionsController {
  @Get('low-confidence')
  lowConfidence() {
    return {
      data: {
        items: [
          {
            matchId: 'match-1',
            confidenceScore: 48,
            isLowConfidence: true,
            avoidReason: 'lowDataQuality',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
        },
      },
    };
  }
}

describe('Admin Low Confidence Endpoint E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestAdminPredictionsController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/predictions/low-confidence', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/predictions/low-confidence')
      .expect(200)
      .expect(({ body }: { body: { data: { items: Array<{ isLowConfidence: boolean; confidenceScore: number }> } } }) => {
        expect(body.data.items[0].isLowConfidence).toBe(true);
        expect(body.data.items[0].confidenceScore).toBeLessThan(60);
      });
  });
});
