import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Controller, Get, Module } from '@nestjs/common';

@Controller('health')
class TestHealthController {
  @Get()
  health() {
    return { success: true, data: { status: 'ok' }, meta: null, error: null };
  }
}

@Module({
  controllers: [TestHealthController],
})
class TestAppModule {}

describe('Health E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET)', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }: { body: { success: boolean; data: { status: string } } }) => {
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
      });
  });
});
