import { BacktestController } from './backtest.controller';

describe('BacktestController', () => {
  it('returns wrapped data for run endpoint', async () => {
    const serviceMock = {
      run: jest.fn().mockResolvedValue({ id: 'bt-1', sampleSize: 10 }),
      results: jest.fn(),
    };

    const controller = new BacktestController(serviceMock as any);
    const response = await controller.run({ user: { id: 'admin-1' } } as any, {
      modelVersionId: 'mv1',
      from: '2025-01-01T00:00:00.000Z',
      to: '2025-01-31T23:59:59.999Z',
      sampleLimit: 100,
    } as any);

    expect(response).toEqual({ data: { id: 'bt-1', sampleSize: 10 } });
    expect(serviceMock.run).toHaveBeenCalledWith(expect.any(Object), 'admin-1');
  });

  it('returns paginated results payload', async () => {
    const serviceMock = {
      run: jest.fn(),
      results: jest.fn().mockResolvedValue({
        data: [{ id: 'bt-1' }],
        meta: { page: 1, pageSize: 20, total: 1, pageCount: 1 },
      }),
    };

    const controller = new BacktestController(serviceMock as any);
    const payload = await controller.results({ page: 1, pageSize: 20 } as any);

    expect(payload.data).toHaveLength(1);
    expect(payload.meta.total).toBe(1);
  });
});
