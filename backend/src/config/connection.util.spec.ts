import {
  buildCorsOriginDelegate,
  matchesCorsOrigin,
  resolveCorsOrigins,
} from './connection.util';

describe('connection.util CORS helpers', () => {
  it('matches exact origins', () => {
    expect(matchesCorsOrigin('http://localhost:3001', 'http://localhost:3001')).toBe(true);
    expect(matchesCorsOrigin('http://localhost:3001', 'http://localhost:3002')).toBe(false);
  });

  it('matches wildcard sslip preview origins', () => {
    expect(
      matchesCorsOrigin(
        'http://rl2lrtfe0gzduatdk5mn2c7g.46.225.183.57.sslip.io',
        'http://*.46.225.183.57.sslip.io',
      ),
    ).toBe(true);
    expect(
      matchesCorsOrigin(
        'https://rl2lrtfe0gzduatdk5mn2c7g.46.225.183.57.sslip.io',
        'http://*.46.225.183.57.sslip.io',
      ),
    ).toBe(false);
  });

  it('derives sibling sslip origins from configured base urls', () => {
    const allowlist = resolveCorsOrigins('http://frontend.example.com') as string[];
    const delegate = buildCorsOriginDelegate({
      allowlist,
      baseUrls: ['http://pgpp6jnd1ckox8cf9cjaeka2.46.225.183.57.sslip.io'],
    });

    expect(delegate).not.toBe(true);
    if (delegate === true) {
      return;
    }

    const callback = jest.fn();
    delegate('http://rl2lrtfe0gzduatdk5mn2c7g.46.225.183.57.sslip.io', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});
