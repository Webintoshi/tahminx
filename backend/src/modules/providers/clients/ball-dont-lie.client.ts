import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { PROVIDER_POLICIES } from 'src/shared/constants/provider.constants';
import { BaseProviderHttpClient } from './base-provider.client';

const ESPN_SITE_BASE_URL = 'https://site.api.espn.com/apis/site/v2';
const NBA_LEAGUE_CODE = 'nba';

interface EspnBasketballResponse {
  events?: Array<Record<string, unknown>>;
  header?: Record<string, unknown>;
  standings?: Record<string, unknown>;
  boxscore?: Record<string, unknown>;
  sports?: Array<Record<string, unknown>>;
}

@Injectable()
export class BallDontLieClient {
  private readonly http: BaseProviderHttpClient;
  private readonly apiKey?: string;

  constructor(
    configService: ConfigService,
    metricsService: MetricsService,
  ) {
    const policy = PROVIDER_POLICIES.find((item) => item.code === 'ball_dont_lie');
    const rateLimitPerSecond = Math.max(1, Math.floor((policy?.rateLimitPerMinute || 600) / 60));
    this.http = new BaseProviderHttpClient(
      process.env.BALL_DONT_LIE_BASE_URL || 'https://api.balldontlie.io/v1',
      Number(configService.get<number>('providers.timeoutMs', 10000)),
      Number(configService.get<number>('providers.retryCount', 3)),
      Number(configService.get<number>('providers.retryBackoffMs', 250)),
      rateLimitPerSecond,
      {
        providerCode: 'ball_dont_lie',
        circuitBreakerThreshold: Number(configService.get<number>('providers.circuitBreakerThreshold', 5)),
        circuitBreakerCooldownMs: Number(configService.get<number>('providers.circuitBreakerCooldownMs', 30000)),
        adaptiveBackoffMaxMs: Number(configService.get<number>('providers.adaptiveBackoffMaxMs', 15000)),
        observe: (status, durationMs) => metricsService.observeProviderCall('ball_dont_lie', status, durationMs),
      },
    );

    this.apiKey = process.env.BALL_DONT_LIE_API_KEY;
  }

  hasApiKeyConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async getTeams(rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get('/teams', { headers: this.getAuthHeaders() }, rawDebug);
    }

    const response = await fetchEspnJson('/sports/basketball/nba/teams', rawDebug);
    const sports = asArray(response.sports);
    const leagues = asArray(sports[0]?.leagues);
    const teams = asArray(leagues[0]?.teams).map((row) => mapEspnBasketballTeam(asObject(row.team)));
    return { data: teams };
  }

  async getPlayers(teamId?: string, rawDebug = false): Promise<unknown> {
    if (!this.apiKey) {
      return { data: [] };
    }

    const query = new URLSearchParams();
    if (teamId) {
      query.append('team_ids[]', teamId);
    }
    query.append('per_page', '100');
    return this.http.get(`/players?${query.toString()}`, { headers: this.getAuthHeaders() }, rawDebug);
  }

  async getGames(params?: {
    date?: string;
    from?: string;
    to?: string;
    teamId?: string;
    season?: string;
    rawDebug?: boolean;
  }): Promise<unknown> {
    if (!this.apiKey) {
      const dates = buildDateRange(params?.date || params?.from, params?.date || params?.to);
      const games = new Map<string, Record<string, unknown>>();

      for (const date of dates) {
        const response = await fetchEspnJson(`/sports/basketball/nba/scoreboard?dates=${toEspnDate(date)}`, params?.rawDebug ?? false);
        const events = asArray(response.events);
        for (const event of events) {
          const rawGame = mapEspnBasketballEventToGame(event);
          if (!rawGame) {
            continue;
          }

          if (params?.teamId && ![String(rawGame.home_team?.id), String(rawGame.visitor_team?.id)].includes(String(params.teamId))) {
            continue;
          }

          games.set(String(rawGame.id), rawGame);
        }
      }

      return { data: [...games.values()] };
    }

    const query = new URLSearchParams();
    if (params?.date) {
      query.append('dates[]', params.date);
    }
    if (params?.from) {
      query.append('start_date', params.from);
    }
    if (params?.to) {
      query.append('end_date', params.to);
    }
    if (params?.teamId) {
      query.append('team_ids[]', params.teamId);
    }
    if (params?.season) {
      query.append('seasons[]', params.season);
    }
    query.append('per_page', '100');

    return this.http.get(`/games?${query.toString()}`, { headers: this.getAuthHeaders() }, params?.rawDebug ?? false);
  }

  async getGameById(id: string, rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get(`/games/${id}`, { headers: this.getAuthHeaders() }, rawDebug);
    }

    const response = await fetchEspnJson(`/sports/basketball/nba/summary?event=${encodeURIComponent(id)}`, rawDebug);
    return mapEspnBasketballSummaryToGame(response) ?? null;
  }

  async getGameStats(gameId: string, rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return this.http.get(`/stats?game_ids[]=${encodeURIComponent(gameId)}&per_page=100`, { headers: this.getAuthHeaders() }, rawDebug);
    }

    const response = await fetchEspnJson(`/sports/basketball/nba/summary?event=${encodeURIComponent(gameId)}`, rawDebug);
    const players = asArray(asObject(response.boxscore).players);
    return {
      data: players.flatMap((teamBlock) => mapEspnBasketballPlayerStats(asObject(teamBlock), gameId)),
    };
  }

  async getStandings(rawDebug = false): Promise<unknown> {
    if (this.apiKey) {
      return { data: [] };
    }

    const eventId = await findRecentNbaEventId(rawDebug);
    if (!eventId) {
      return { data: [] };
    }

    const response = await fetchEspnJson(`/sports/basketball/nba/summary?event=${encodeURIComponent(eventId)}`, rawDebug);
    return {
      data: mapEspnBasketballStandings(asObject(response.standings)),
    };
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('BALL_DONT_LIE_API_KEY is missing');
    }

    return {
      Authorization: this.apiKey,
    };
  }
}

const mapEspnBasketballTeam = (team: Record<string, unknown>) => ({
  id: String(team.id || '').trim(),
  abbreviation: String(team.abbreviation || '').trim(),
  city: String(team.location || '').trim(),
  conference: String(team.group || '').trim() || undefined,
  division: String(team.standingsGroup || '').trim() || undefined,
  full_name: String(team.displayName || team.name || '').trim(),
  name: String(team.displayName || team.name || '').trim(),
  logo: String(team.logo || asObject(asArray(team.logos)[0]).href || '').trim() || undefined,
});

const mapEspnBasketballEventToGame = (event: Record<string, unknown>) => {
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
    date: String(event.date),
    season: Number(asObject(event.season).year || new Date(event.date as string).getUTCFullYear()),
    status: mapEspnBasketballStatus(competition.status),
    postseason: false,
    home_team_score: toNumber(home?.score) ?? 0,
    visitor_team_score: toNumber(away?.score) ?? 0,
    home_team: mapEspnBasketballTeam(homeTeam),
    visitor_team: mapEspnBasketballTeam(awayTeam),
  };
};

const mapEspnBasketballSummaryToGame = (response: EspnBasketballResponse) => {
  const header = asObject(response.header);
  const competitions = asArray(header.competitions);
  return mapEspnBasketballEventToGame({
    id: header.id,
    date: competitions[0]?.date,
    season: header.season,
    competitions,
  });
};

const mapEspnBasketballPlayerStats = (teamBlock: Record<string, unknown>, gameId: string) => {
  const teamId = String(asObject(teamBlock.team).id || '').trim();
  const statistics = asArray(teamBlock.statistics);
  const playerGroups = statistics.flatMap((item) => asArray(item.athletes));

  return playerGroups
    .map((row) => {
      const athlete = asObject(row.athlete);
      const statValues = Array.isArray(row.stats) ? row.stats.map((item) => String(item ?? '')) : [];
      return {
        game: { id: gameId },
        player: {
          id: String(athlete.id || '').trim(),
        },
        team: {
          id: teamId,
        },
        min: statValues[0],
        pts: statValues[1],
        reb: statValues[5],
        ast: statValues[6],
      };
    })
    .filter((row) => row.player.id);
};

const mapEspnBasketballStandings = (standings: Record<string, unknown>) =>
  asArray(standings.groups).flatMap((group) => {
    const entries = asArray(asObject(group.standings).entries);
    return entries.map((entry, index) => {
      const stats = asArray(entry.stats);
      const wins = readStandingStat(stats, 'wins');
      const losses = readStandingStat(stats, 'losses');
      const streak = readStandingString(stats, 'streak');
      return {
        team: { id: String(entry.id || '').trim() },
        rank: index + 1,
        played: wins + losses,
        wins,
        draws: 0,
        losses,
        points: wins,
        form: streak,
      };
    });
  });

const readStandingStat = (stats: Record<string, unknown>[], name: string) => {
  const row = stats.find((item) => String(item.name || '').toLowerCase() === name.toLowerCase());
  return toNumber(row?.value) ?? 0;
};

const readStandingString = (stats: Record<string, unknown>[], name: string) => {
  const row = stats.find((item) => String(item.name || '').toLowerCase() === name.toLowerCase());
  return String(row?.displayValue || '').trim() || undefined;
};

const mapEspnBasketballStatus = (status: unknown) => {
  const type = asObject(asObject(status).type);
  if (type.completed === true) {
    return 'Final';
  }

  const state = String(type.state || '').toLowerCase();
  if (state === 'in') {
    return 'Live';
  }

  return 'Scheduled';
};

const findRecentNbaEventId = async (rawDebug = false) => {
  for (let offset = 0; offset <= 3; offset += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    const response = await fetchEspnJson(`/sports/basketball/nba/scoreboard?dates=${toEspnDate(date.toISOString().slice(0, 10))}`, rawDebug);
    const events = asArray(response.events);
    if (events.length) {
      return String(events[0].id || '').trim() || null;
    }
  }

  return null;
};

const fetchEspnJson = async (path: string, rawDebug = false): Promise<EspnBasketballResponse> => {
  const response = await fetch(`${ESPN_SITE_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'TahminX/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN request failed (${response.status})`);
  }

  const data = (await response.json()) as EspnBasketballResponse;
  if (rawDebug) {
    console.debug(`ESPN raw response (${path})`, JSON.stringify(data).slice(0, 4000));
  }
  return data;
};

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

const toEspnDate = (value: string) => value.replace(/-/g, '');

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
