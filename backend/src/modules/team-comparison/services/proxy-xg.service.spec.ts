import { ProxyXGService } from './proxy-xg.service';

describe('ProxyXGService', () => {
  const service = new ProxyXGService();

  it('keeps existing xg when present', () => {
    expect(
      service.resolve({
        existingXg: 1.48,
        shots: 11,
        shotsOnTarget: 4,
        bigChances: 2,
        corners: 5,
      }),
    ).toEqual({
      value: 1.48,
      usedProxy: false,
    });
  });

  it('computes proxy xg when xg is missing', () => {
    expect(
      service.resolve({
        shots: 12,
        shotsOnTarget: 5,
        bigChances: 2,
        corners: 6,
      }),
    ).toEqual({
      value: 2.08,
      usedProxy: true,
    });
  });
});
