import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { PROVIDER_POLICIES } from 'src/shared/constants/provider.constants';
import { BaseProviderHttpClient } from './base-provider.client';

const ESPN_SITE_BASE_URL = 'https://site.api.espn.com/apis/site/v2';

type SupportedSoccerLeagueCode = 'PL' | 'TSL';

interface SupportedSoccerLeague {
  providerCode: SupportedSoccerLeagueCode;
  espnCode: string;
  name: string;
  country: string;
}

interface EspnScoreboardResponse {
  events?: Array<Record<string, unknown>>;
  sports?: Array<Record<string, unknown>>;
}

interface EspnSummaryResponse {
  header?: Record<string, unknown>;
}

const SUPPORTED_SOCCER_LEAGUES: SupportedSoccerLeague[] = [
  { providerCode: 'PL', espnCode: 'eng.1', name: 'Premier League', country: 'England' },
  { providerCode: 'TSL', espnCode: 'tur.1', name: 'Turkish Super Lig', country: 'Turkey' },
];

@Injectable()
export class FootballDataClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(
    configService: ConfigService,
    metricsService: MetricsService,
  ) {
    const policy = PROVIDER_POLICIES.find((item) => item.code === 'football_data');
    const rateLimitPerSecond = Math.max(1, Math.floor((policy?.rateLimitPerMinute || 60) / 60));
    this.http = new BaseProviderHttpClient(
      process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
      rateLimitPerSecond,
      {
        providerCode: 'football_data',
        circuitBreakerThreshold: Number(configService.get<number>('providers.circuitBreakerThreshold', 5)),
        circuitBreakerCooldownMs: Number(configService.get<number>('providers.circuitBreakerCooldownMs', 30000)),
        adaptiveBackoffMaxMs: Number(configService.get<number>('providers.adaptiveBackoffMaxMs', 15000)),
        observe: (status, durationMs) => metricsService.observeProviderCall('football_data', status, durationMs),
      },
    );

    this.apiKey = process.env.FOOTBALL_DATA_API_KEY;
  }

  hasApiKeyConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async getLeagues(rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get('/competitions', { headers: this.getAuthHeaders() }, rawDebug);
    }

    return {
      competitions: SUPPORTED_SOCCER_LEAGUES.map((league) => ({
        id: league.providerCode,
        code: league.providerCode,
        name: league.name,
        area: { name: league.country },
      })),
    };
  }

  async getCompetition(leagueCode: string, rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get(`/competitions/${leagueCode}`, { headers: this.getAuthHeaders() }, rawDebug);
    }

    const league = resolveSoccerLeague(leagueCode);
    const seasonYear = deriveFootballSeasonYear();
    return {
      id: league.providerCode,
      code: league.providerCode,
      name: league.name,
      currentSeason: {
        id: String(seasonYear),
        year: seasonYear,
        startDate: `${seasonYear}-08-01`,
        endDate: `${seasonYear + 1}-05-31`,
        current: true,
      },
      seasons: [
        {
          id: String(seasonYear),
          year: seasonYear,
          startDate: `${seasonYear}-08-01`,
          endDate: `${seasonYear + 1}-05-31`,
          current: true,
        },
      ],
    };
  }

  async getTeams(leagueCode: string, rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get(`/competitions/${leagueCode}/teams`, { headers: this.getAuthHeaders() }, rawDebug);
    }

    const league = resolveSoccerLeague(leagueCode);
    const response = await fetchEspnJson(
      `/sports/soccer/${league.espnCode}/teams`,
      rawDebug,
    );
    const sports = asArray(response.sports);
    const leagues = asArray(sports[0]?.leagues);
    const teams = asArray(leagues[0]?.teams).map((row) => mapEspnSoccerTeam(asObject(row.team), league.country));
    return { teams };
  }

  async getMatches(params?: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    competitionCode?: string;
    status?: string;
    rawDebug?: boolean;
  }): Promise<unknown> {
    if (this.apiKey) {
      const query = new URLSearchParams();
      if (params?.date) {
        query.set('dateFrom', params.date);
        query.set('dateTo', params.date);
      }
      if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params?.dateTo) query.set('dateTo', params.dateTo);
      if (params?.competitionCode) query.set('competitions', params.competitionCode);
      if (params?.status) query.set('status', params.status);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      return this.http.get(`/matches${suffix}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
    }

    const leagues = params?.competitionCode
      ? [resolveSoccerLeague(params.competitionCode)]
      : SUPPORTED_SOCCER_LEAGUES;
    const dates = buildDateRange(params?.date || params?.dateFrom, params?.date || params?.dateTo);
    const matches = new Map<string, Record<string, unknown>>();

    for (const league of leagues) {
      for (const date of dates) {
        const response = await fetchEspnJson(
          `/sports/soccer/${league.espnCode}/scoreboard?dates=${toEspnDate(date)}`,
          params?.rawDebug ?? false,
        );
        const events = asArray(response.events);
        for (const event of events) {
          const rawMatch = mapEspnSoccerEventToMatch(event, league);
          if (!rawMatch) {
            continue;
          }

          if (params?.status && !matchesStatusMatches(rawMatch.status, params.status)) {
            continue;
          }

          matches.set(String(rawMatch.id), rawMatch);
        }
      }
    }

    return { matches: [...matches.values()] };
  }

  async getStandings(leagueCode: string, rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get(`/competitions/${leagueCode}/standings`, { headers: this.getAuthHeaders() }, rawDebug);
    }

    return { standings: [] };
  }

  async getMatchById(id: string, rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get(`/matches/${id}`, { headers: this.getAuthHeaders() }, rawDebug);
    }

    for (const league of SUPPORTED_SOCCER_LEAGUES) {
      const response = await fetchEspnJson(
        `/sports/soccer/${league.espnCode}/summary?event=${encodeURIComponent(id)}`,
        rawDebug,
      );
      const rawMatch = mapEspnSoccerSummaryToMatch(response, league);
      if (rawMatch) {
        return { match: rawMatch };
      }
    }

    return { match: null };
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY is missing');
    }
    return {
      'X-Auth-Token': this.apiKey,
    };
  }
}

const resolveSoccerLeague = (leagueCode?: string): SupportedSoccerLeague => {
  const normalized = String(leagueCode || 'PL').trim().toLowerCase();
  return (
    SUPPORTED_SOCCER_LEAGUES.find(
      (league) =>
        league.providerCode.toLowerCase() === normalized || league.espnCode.toLowerCase() === normalized,
    ) || SUPPORTED_SOCCER_LEAGUES[0]
  );
};

const deriveFootballSeasonYear = () => {
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
};

const toEspnDate = (value: string) => value.replace(/-/g, '');

const buildDateRange = (fromValue?: string, toValue?: string): string[] => {
  const start = parseDateOnly(fromValue) ?? new Date();
  const end = parseDateOnly(toValue) ?? start;
  const range: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const limit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cursor.getTime() <= limit.getTime()) {
    range.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return range;
};

const parseDateOnly = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const matchesStatusMatches = (actual: unknown, expected: string) => {
  const normalizedActual = String(actual || '').trim().toUpperCase();
  const normalizedExpected = expected.trim().toUpperCase();
  if (normalizedExpected === 'FINISHED') {
    return normalizedActual === 'FINISHED';
  }
  if (normalizedExpected === 'LIVE') {
    return normalizedActual === 'LIVE';
  }
  return normalizedActual === normalizedExpected;
};

const mapEspnSoccerSummaryToMatch = (response: EspnSummaryResponse, league: SupportedSoccerLeague) => {
  const header = asObject(response.header);
  const competitions = asArray(header.competitions);
  return mapEspnSoccerEventToMatch(
    {
      id: header.id,
      date: competitions[0]?.date,
      season: header.season,
      competitions,
    },
    league,
  );
};

const mapEspnSoccerEventToMatch = (event: Record<string, unknown>, league: SupportedSoccerLeague) => {
  const competition = asObject(asArray(event.competitions)[0]);
  const competitors = asArray(competition.competitors);
  const home = competitors.find((item) => String(item.homeAway || '').toLowerCase() === 'home') || competitors[0];
  const away = competitors.find((item) => String(item.homeAway || '').toLowerCase() === 'away') || competitors[1];
  const homeTeam = asObject(home?.team);
  const awayTeam = asObject(away?.team);

  if (!event.id || !event.date || !homeTeam.id || !awayTeam.id) {
    return null;
  }

  return {
    id: String(event.id),
    utcDate: String(event.date),
    season: String(asObject(event.season).year || deriveFootballSeasonYear()),
    competition: {
      id: league.providerCode,
      code: league.providerCode,
      name: league.name,
    },
    home_team: mapEspnSoccerTeam(homeTeam, league.country),
    away_team: mapEspnSoccerTeam(awayTeam, league.country),
    home_score: toNumber(home?.score),
    away_score: toNumber(away?.score),
    status: mapEspnStatus(competition.status),
    venue: asObject(competition.venue).fullName,
  };
};

const mapEspnSoccerTeam = (team: Record<string, unknown>, country?: string) => ({
  id: String(team.id || '').trim(),
  name: String(team.displayName || team.name || '').trim(),
  tla: String(team.abbreviation || '').trim(),
  crest: String(team.logo || asObject(asArray(team.logos)[0]).href || '').trim() || undefined,
  country,
});

const mapEspnStatus = (status: unknown) => {
  const statusObject = asObject(status);
  const type = asObject(statusObject.type);
  if (type.completed === true) {
    return 'FINISHED';
  }

  const state = String(type.state || '').toLowerCase();
  if (state === 'in') {
    return 'LIVE';
  }

  return 'SCHEDULED';
};

const fetchEspnJson = async (path: string, rawDebug = false): Promise<EspnScoreboardResponse & EspnSummaryResponse> => {
  const response = await fetch(`${ESPN_SITE_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'TahminX/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status})`);
  }

  const data = (await response.json()) as EspnScoreboardResponse & EspnSummaryResponse;
  if (rawDebug) {
    console.debug(`ESPN raw response (${path})`, JSON.stringify(data).slice(0, 4000));
  }
  return data;
};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
