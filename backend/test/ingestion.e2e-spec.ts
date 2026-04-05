import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Controller('api/v1/admin/ingestion')
class TestIngestionController {
  @Post('run')
  run(@Body() _dto: Record<string, unknown>) {
    return { data: { id: 'job-1', status: 'PENDING' } };
  }

  @Get('jobs')
  list() {
    return { data: [], meta: { page: 1, pageSize: 20, total: 0 } };
  }

  @Get('jobs/failed')
  failed(@Query('limit') _limit?: string) {
    return { data: [] };
  }

  @Get('jobs/:id')
  detail(@Param('id') id: string) {
    return { data: { id } };
  }

  @Post('jobs/:id/retry')
  retry(@Param('id') id: string) {
    return { data: { id, retried: true } };
  }
}

describe('Ingestion E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestIngestionController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/admin/ingestion/jobs/failed', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/ingestion/jobs/failed')
      .expect(200)
      .expect(({ body }: { body: { data: unknown[] } }) => {
        expect(Array.isArray(body.data)).toBe(true);
      });
  });
});
