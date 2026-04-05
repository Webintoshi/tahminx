import {
  NormalizedLeague,
  NormalizedMatch,
  NormalizedMatchEvent,
  NormalizedPlayer,
  NormalizedPlayerStats,
  NormalizedSeason,
  NormalizedStanding,
  NormalizedTeam,
  NormalizedTeamStats,
} from '../interfaces/normalized.types';

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
  }
  return [];
};

const asObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const mapRawLeagues = (rows: unknown[], sportCode: 'FOOTBALL' | 'BASKETBALL'): NormalizedLeague[] =>
  asArray(rows)
    .map((row) => {
      const area = asObject(row.area);
      return {
        externalId: String(row.code ?? row.id ?? row.league_id ?? row.strLeague ?? '').trim(),
        name: String(row.name ?? row.strLeague ?? asObject(row.league).name ?? '').trim(),
        country: strOrUndefined(row.country ?? area.name),
        sportCode,
        logoUrl: strOrUndefined(row.emblem ?? row.logo ?? row.strBadge),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId && item.name);

export const mapRawSeasons = (rows: unknown[], leagueExternalId: string): NormalizedSeason[] =>
  asArray(rows)
    .map((row) => {
      const year = numberOrUndefined(row.year ?? row.season ?? row.startDate?.toString().slice(0, 4)) ?? new Date().getUTCFullYear();
      const startDate = strOrUndefined(row.startDate ?? row.start ?? row.currentStartDate);
      const endDate = strOrUndefined(row.endDate ?? row.end ?? row.currentEndDate);
      return {
        externalId: String(row.id ?? row.season ?? row.year ?? year),
        leagueExternalId,
        seasonYear: year,
        name: String(row.name ?? row.season ?? row.year ?? `${year}`),
        startDate,
        endDate,
        isCurrent: Boolean(row.current ?? row.isCurrent ?? false),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId);

export const mapRawTeams = (rows: unknown[]): NormalizedTeam[] =>
  asArray(rows)
    .map((row) => ({
      externalId: String(row.id ?? row.team_id ?? row.idTeam ?? '').trim(),
      name: String(row.name ?? row.full_name ?? row.strTeam ?? '').trim(),
      shortName: strOrUndefined(row.short_name ?? row.tla ?? row.abbreviation),
      country: strOrUndefined(row.country),
      logoUrl: strOrUndefined(row.crest ?? row.logo ?? row.strBadge),
      venue: strOrUndefined(row.venue ?? row.strStadium),
      rawPayload: row,
    }))
    .filter((item) => item.externalId && item.name);

export const mapRawPlayers = (rows: unknown[]): NormalizedPlayer[] =>
  asArray(rows)
    .map((row) => {
      const firstName = strOrUndefined(row.firstname ?? row.first_name);
      const lastName = strOrUndefined(row.lastname ?? row.last_name);
      const joinedName = [firstName, lastName].filter(Boolean).join(' ');
      return {
        externalId: String(row.id ?? row.player_id ?? row.idPlayer ?? '').trim(),
        name: String(row.name ?? joinedName ?? row.strPlayer ?? '').trim(),
        teamExternalId: strOrUndefined(row.team_id ?? row.idTeam),
        nationality: strOrUndefined(row.nationality ?? row.country ?? row.strNationality),
        position: strOrUndefined(row.position ?? row.strPosition),
        birthDate: strOrUndefined(row.dateOfBirth ?? row.birth_date ?? row.dateBorn),
        photoUrl: strOrUndefined(row.photo ?? row.strCutout),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId && item.name);

export const mapRawMatches = (rows: unknown[]): NormalizedMatch[] =>
  asArray(rows)
    .map((row) => {
      const fixture = asObject(row.fixture);
      const teams = asObject(row.teams);
      const goals = asObject(row.goals);
      const competition = asObject(row.competition);
      const league = asObject(row.league);
      const homeTeam = asObject(row.home_team ?? teams.home);
      const awayTeam = asObject(row.away_team ?? teams.away ?? row.visitor_team);
      const status = String(row.status ?? asObject(fixture.status).short ?? row.strStatus ?? '').toUpperCase();

      return {
        externalId: String(row.id ?? fixture.id ?? row.idEvent ?? '').trim(),
        leagueExternalId: String(
          competition.code ?? competition.id ?? league.id ?? league.name ?? row.idLeague ?? row.league ?? 'nba',
        ).trim(),
        seasonExternalId: strOrUndefined(row.season),
        homeTeamExternalId: String(homeTeam.id ?? row.homeTeamId ?? '').trim(),
        awayTeamExternalId: String(awayTeam.id ?? row.awayTeamId ?? '').trim(),
        matchDate: String(row.utcDate ?? row.date ?? fixture.date ?? row.dateEvent ?? new Date().toISOString()),
        status: normalizeStatus(status),
        homeScore: numberOrUndefined(row.home_score ?? goals.home ?? row.intHomeScore ?? row.home_team_score),
        awayScore: numberOrUndefined(row.away_score ?? goals.away ?? row.intAwayScore ?? row.visitor_team_score),
        venue: strOrUndefined(row.venue ?? asObject(fixture.venue).name ?? row.strVenue),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalId && item.leagueExternalId && item.homeTeamExternalId && item.awayTeamExternalId);

export const mapRawStandings = (rows: unknown[]): NormalizedStanding[] =>
  asArray(rows)
    .map((row) => {
      const team = asObject(row.team);
      return {
        externalTeamId: String(team.id ?? row.team_id ?? row.idTeam ?? row.teamId ?? '').trim(),
        rank: Number(row.rank ?? row.position ?? 0),
        played: Number(row.playedGames ?? row.played ?? row.games_played ?? 0),
        wins: Number(row.won ?? row.wins ?? 0),
        draws: Number(row.draw ?? row.draws ?? 0),
        losses: Number(row.lost ?? row.losses ?? 0),
        goalsFor: numberOrUndefined(row.goalsFor ?? row.goals_for ?? row.for),
        goalsAgainst: numberOrUndefined(row.goalsAgainst ?? row.goals_against ?? row.against),
        points: Number(row.points ?? 0),
        form: strOrUndefined(row.form),
        rawPayload: row,
      };
    })
    .filter((item) => item.externalTeamId);

export const mapRawMatchEvents = (rows: unknown[], externalMatchId: string): NormalizedMatchEvent[] =>
  asArray(rows).map((row) => ({
    externalMatchId,
    minute: numberOrUndefined(row.minute),
    type: String(row.type ?? row.strEvent ?? 'event'),
    externalTeamId: strOrUndefined(asObject(row.team).id ?? row.team_id),
    externalPlayerId: strOrUndefined(asObject(row.player).id ?? row.player_id),
    payload: row,
  }));

export const mapRawTeamStats = (rows: unknown[], externalMatchId: string): NormalizedTeamStats[] =>
  asArray(rows)
    .map((row) => ({
      externalMatchId,
      externalTeamId: String(asObject(row.team).id ?? row.team_id ?? '').trim(),
      possession: numberOrUndefined(row.possession),
      shots: numberOrUndefined(row.shots),
      shotsOnTarget: numberOrUndefined(row.shots_on_target ?? row.shotsOnTarget),
      corners: numberOrUndefined(row.corners),
      fouls: numberOrUndefined(row.fouls),
      payload: row,
    }))
    .filter((item) => item.externalTeamId);

export const mapRawPlayerStats = (rows: unknown[], externalMatchId: string): NormalizedPlayerStats[] =>
  asArray(rows)
    .map((row) => ({
      externalMatchId,
      externalPlayerId: String(asObject(row.player).id ?? row.player_id ?? '').trim(),
      externalTeamId: strOrUndefined(asObject(row.team).id ?? row.team_id),
      minutes: numberOrUndefined(row.min ?? row.minutes),
      points: numberOrUndefined(row.pts ?? row.points),
      assists: numberOrUndefined(row.ast ?? row.assists),
      rebounds: numberOrUndefined(row.reb ?? row.rebounds),
      goals: numberOrUndefined(row.goals),
      payload: row,
    }))
    .filter((item) => item.externalPlayerId);

const normalizeStatus = (status: string): NormalizedMatch['status'] => {
  if (['LIVE', '1H', '2H', 'IN_PLAY', 'IN PROGRESS', 'Q1', 'Q2', 'Q3', 'Q4'].includes(status)) return 'LIVE';
  if (['FINISHED', 'FT', 'COMPLETED', 'FINAL'].includes(status)) return 'COMPLETED';
  if (['POSTPONED'].includes(status)) return 'POSTPONED';
  if (['CANCELED', 'CANCELLED'].includes(status)) return 'CANCELED';
  return 'SCHEDULED';
};

const strOrUndefined = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const output = String(value).trim();
  return output ? output : undefined;
};

const numberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};