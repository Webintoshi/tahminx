import { Test } from '@nestjs/testing';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';

describe('SportsController', () => {
  it('returns sports list', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SportsController],
      providers: [
        {
          provide: SportsService,
          useValue: { listSports: jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Football' }] }) },
        },
      ],
    }).compile();

    const controller = moduleRef.get(SportsController);
    const response = await controller.list();

    expect(response.data).toHaveLength(1);
    expect(response.data[0].name).toBe('Football');
  });
});
