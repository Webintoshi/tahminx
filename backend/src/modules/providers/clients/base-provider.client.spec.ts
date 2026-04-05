import axios from 'axios';
import { BaseProviderHttpClient } from './base-provider.client';

jest.mock('axios');

describe('BaseProviderHttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens circuit breaker after consecutive failures', async () => {
    const failingRequest = jest.fn().mockRejectedValue({
      message: 'rate limited',
      response: { status: 429, headers: {} },
    });

    (axios.create as jest.Mock).mockReturnValue({ request: failingRequest });

    const client = new BaseProviderHttpClient('https://provider.example', 1000, 0, 10, 100, {
      providerCode: 'provider_test',
      circuitBreakerThreshold: 2,
      circuitBreakerCooldownMs: 60000,
    });

    await expect(client.get('/health')).rejects.toBeTruthy();
    await expect(client.get('/health')).rejects.toBeTruthy();
    await expect(client.get('/health')).rejects.toThrow('Circuit breaker open');
  });

  it('uses fallback base url on retry', async () => {
    const primaryRequest = jest.fn().mockRejectedValue({
      message: 'primary down',
      response: { status: 503, headers: {} },
    });
    const fallbackRequest = jest.fn().mockResolvedValue({ data: { ok: true } });

    (axios.create as jest.Mock)
      .mockReturnValueOnce({ request: primaryRequest })
      .mockReturnValueOnce({ request: fallbackRequest });

    const client = new BaseProviderHttpClient('https://primary.example', 1000, 1, 1, 100, {
      providerCode: 'provider_fallback',
      fallbackBaseUrls: ['https://fallback.example'],
      circuitBreakerThreshold: 99,
    });

    const result = await client.get<{ ok: boolean }>('/ping');
    expect(result.ok).toBe(true);
    expect(primaryRequest).toHaveBeenCalledTimes(1);
    expect(fallbackRequest).toHaveBeenCalledTimes(1);
  });
});
