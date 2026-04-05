import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { MatchesController } from '../src/modules/matches/matches.controller';
import { MatchesService } from '../src/modules/matches/matches.service';
import { PredictionsController } from '../src/modules/predictions/predictions.controller';
import { PredictionsService } from '../src/modules/predictions/predictions.service';

describe('Prediction Endpoints E2E', () => {
  let app: INestApplication;

  const predictionCard = {
    matchId: 'match-1',
    sport: 'football',
    league: { id: 'league-1', name: 'Premier League' },
    homeTeam: { id: 'team-1', name: 'Arsenal', logo: 'logo1' },
    awayTeam: { id: 'team-2', name: 'Chelsea', logo: 'logo2' },
    matchDate: '2026-05-10T18:00:00.000Z',
    status: 'scheduled',
    probabilities: { homeWin: 0.52, draw: 0.24, awayWin: 0.24 },
    expectedScore: { home: 1.8, away: 1.1 },
    confidenceScore: 78,
    summary: 'Ev sahibi formu daha yuksek.',
    riskFlags: ['Dusuk veri guveni'],
    updatedAt: '2026-05-09T12:00:00.000Z',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PredictionsController, MatchesController],
      providers: [
        {
          provide: PredictionsService,
          useValue: {
            list: jest.fn().mockResolvedValue({
              data: [predictionCard],
              meta: { page: 1, pageSize: 20, total: 1 },
            }),
            highConfidence: jest.fn().mockResolvedValue({
              data: [predictionCard],
              meta: { page: 1, pageSize: 20, total: 1 },
            }),
          },
        },
        {
          provide: MatchesService,
          useValue: {
            prediction: jest.fn().mockResolvedValue({ data: predictionCard }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/matches/:id/prediction', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/matches/match-1/prediction')
      .expect(200)
      .expect(({ body }: { body: { data: typeof predictionCard } }) => {
        expect(body.data.matchId).toBe('match-1');
        expect(body.data.confidenceScore).toBe(78);
      });
  });

  it('GET /api/v1/predictions', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/predictions')
      .expect(200)
      .expect(({ body }: { body: { data: typeof predictionCard[]; meta: { total: number } } }) => {
        expect(body.data.length).toBe(1);
        expect(body.meta.total).toBe(1);
      });
  });

  it('GET /api/v1/predictions/high-confidence', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/predictions/high-confidence')
      .expect(200)
      .expect(({ body }: { body: { data: typeof predictionCard[] } }) => {
        expect(body.data[0].confidenceScore).toBeGreaterThanOrEqual(75);
      });
  });
});
