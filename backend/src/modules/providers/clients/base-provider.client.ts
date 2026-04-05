import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { Injectable, Logger } from '@nestjs/common';

interface BaseProviderOptions {
  providerCode?: string;
  circuitBreakerThreshold?: number;
  circuitBreakerCooldownMs?: number;
  adaptiveBackoffMaxMs?: number;
  fallbackBaseUrls?: string[];
  observe?: (status: 'success' | 'failed', durationMs: number) => void;
}

type CircuitState = 'closed' | 'open' | 'half_open';

@Injectable()
export class BaseProviderHttpClient {
  private readonly logger = new Logger(BaseProviderHttpClient.name);
  private readonly axiosByBaseUrl: Map<string, AxiosInstance> = new Map();
  private readonly baseUrls: string[];
  private readonly providerCode: string;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerCooldownMs: number;
  private readonly adaptiveBackoffMaxMs: number;
  private readonly observer?: (status: 'success' | 'failed', durationMs: number) => void;

  private static readonly requestTimestampsByProvider = new Map<string, number[]>();
  private static readonly circuitFailureCountByProvider = new Map<string, number>();
  private static readonly circuitOpenUntilByProvider = new Map<string, number>();
  private static readonly lastErrorAtByProvider = new Map<string, number>();

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly retryCount: number,
    private readonly retryBackoffMs: number,
    private readonly rateLimitPerSecond = 8,
    options?: BaseProviderOptions,
  ) {
    this.providerCode = options?.providerCode || baseUrl;
    this.circuitBreakerThreshold = Math.max(1, Number(options?.circuitBreakerThreshold || process.env.PROVIDER_CIRCUIT_BREAKER_THRESHOLD || 5));
    this.circuitBreakerCooldownMs = Math.max(1000, Number(options?.circuitBreakerCooldownMs || process.env.PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS || 30000));
    this.adaptiveBackoffMaxMs = Math.max(250, Number(options?.adaptiveBackoffMaxMs || process.env.PROVIDER_ADAPTIVE_BACKOFF_MAX_MS || 15000));
    this.observer = options?.observe;
    this.baseUrls = [baseUrl, ...(options?.fallbackBaseUrls || []).filter((item) => item && item !== baseUrl)];

    this.baseUrls.forEach((url) => {
      this.axiosByBaseUrl.set(
        url,
        axios.create({
          baseURL: url,
          timeout: timeoutMs,
        }),
      );
    });
  }

  async get<T>(url: string, config?: AxiosRequestConfig, rawDebug = false): Promise<T> {
    return this.requestWithRetry<T>('get', url, undefined, config, rawDebug);
  }

  private async requestWithRetry<T>(
    method: 'get',
    url: string,
    data: unknown,
    config?: AxiosRequestConfig,
    rawDebug = false,
  ): Promise<T> {
    this.ensureCircuitAllowsCall();
    let attempt = 0;
    while (attempt <= this.retryCount) {
      await this.waitRateLimitSlot();
      const start = Date.now();
      try {
        const baseUrl = this.baseUrls[Math.min(attempt, this.baseUrls.length - 1)];
        const axiosInstance = this.axiosByBaseUrl.get(baseUrl) as AxiosInstance;
        const response = await axiosInstance.request<T>({ method, url, data, ...config });
        if (rawDebug) {
          this.logger.debug(`Provider raw response (${baseUrl}${url}): ${JSON.stringify(response.data).slice(0, 4000)}`);
        }
        this.onRequestSuccess(Date.now() - start);
        return response.data;
      } catch (error) {
        const latency = Date.now() - start;
        const err = error as AxiosError;
        this.onRequestFailure(latency);
        this.logger.warn(
          `Provider request failed provider=${this.providerCode} [${method.toUpperCase()} ${url}] attempt=${attempt + 1} latencyMs=${latency} status=${err.response?.status ?? 'N/A'} message=${err.message}`,
        );
        if (attempt >= this.retryCount) {
          throw error;
        }

        const status = Number(err.response?.status || 0);
        const serverHintMs = Number(err.response?.headers?.['retry-after'] || 0) * 1000;
        const statusPenaltyMs = status === 429 ? 1500 : status >= 500 ? 700 : 250;
        const jitter = Math.floor(Math.random() * 250);
        const computedDelay = this.retryBackoffMs * Math.pow(2, attempt) + statusPenaltyMs + jitter;
        const delayMs = Math.min(this.adaptiveBackoffMaxMs, Math.max(serverHintMs || 0, computedDelay));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      attempt += 1;
    }

    throw new Error('Request retry loop terminated unexpectedly');
  }

  private async waitRateLimitSlot(): Promise<void> {
    const timestamps = BaseProviderHttpClient.requestTimestampsByProvider.get(this.providerCode) || [];
    const now = Date.now();
    const active = timestamps.filter((timestamp) => now - timestamp < 1000);

    if (active.length >= this.rateLimitPerSecond) {
      const oldest = active[0];
      const waitMs = 1000 - (now - oldest);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    active.push(Date.now());
    BaseProviderHttpClient.requestTimestampsByProvider.set(this.providerCode, active);
  }

  private ensureCircuitAllowsCall(): void {
    const openUntil = BaseProviderHttpClient.circuitOpenUntilByProvider.get(this.providerCode) || 0;
    if (openUntil <= 0) {
      return;
    }

    if (Date.now() >= openUntil) {
      BaseProviderHttpClient.circuitOpenUntilByProvider.delete(this.providerCode);
      return;
    }

    throw new Error(`Circuit breaker open for provider ${this.providerCode}`);
  }

  private onRequestSuccess(durationMs: number): void {
    BaseProviderHttpClient.circuitFailureCountByProvider.set(this.providerCode, 0);
    this.observer?.('success', durationMs);
  }

  private onRequestFailure(durationMs: number): void {
    const currentFailures = (BaseProviderHttpClient.circuitFailureCountByProvider.get(this.providerCode) || 0) + 1;
    BaseProviderHttpClient.circuitFailureCountByProvider.set(this.providerCode, currentFailures);
    BaseProviderHttpClient.lastErrorAtByProvider.set(this.providerCode, Date.now());
    this.observer?.('failed', durationMs);

    if (currentFailures >= this.circuitBreakerThreshold) {
      BaseProviderHttpClient.circuitOpenUntilByProvider.set(this.providerCode, Date.now() + this.circuitBreakerCooldownMs);
      this.logger.error(
        `Provider circuit opened provider=${this.providerCode} threshold=${this.circuitBreakerThreshold} cooldownMs=${this.circuitBreakerCooldownMs}`,
      );
    }
  }

  static runtimeStatus(providerCode: string): {
    providerCode: string;
    requestPerSecond: number;
    circuitState: CircuitState;
    consecutiveFailures: number;
    openUntil: string | null;
    lastErrorAt: string | null;
  } {
    const now = Date.now();
    const timestamps = (BaseProviderHttpClient.requestTimestampsByProvider.get(providerCode) || []).filter(
      (item) => now - item < 1000,
    );
    BaseProviderHttpClient.requestTimestampsByProvider.set(providerCode, timestamps);

    const openUntilMs = BaseProviderHttpClient.circuitOpenUntilByProvider.get(providerCode) || 0;
    const circuitState: CircuitState = openUntilMs > now ? 'open' : openUntilMs > 0 ? 'half_open' : 'closed';
    const lastErrorAt = BaseProviderHttpClient.lastErrorAtByProvider.get(providerCode);

    return {
      providerCode,
      requestPerSecond: timestamps.length,
      circuitState,
      consecutiveFailures: BaseProviderHttpClient.circuitFailureCountByProvider.get(providerCode) || 0,
      openUntil: openUntilMs ? new Date(openUntilMs).toISOString() : null,
      lastErrorAt: lastErrorAt ? new Date(lastErrorAt).toISOString() : null,
    };
  }
}
