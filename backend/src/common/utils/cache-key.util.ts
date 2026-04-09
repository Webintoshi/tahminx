export class CacheKeys {
  static matchDetail(matchId: string): string {
    return `matches:detail:${matchId}`;
  }

  static matchesList(serializedQuery: string): string {
    return `matches:list:${serializedQuery}`;
  }

  static leagueDetail(leagueId: string): string {
    return `leagues:detail:${leagueId}`;
  }

  static leagueStandings(leagueId: string): string {
    return `standings:league:${leagueId}`;
  }

  static predictionsList(serializedQuery: string): string {
    return `predictions:list:${serializedQuery}`;
  }

  static predictionsHighConfidence(serializedQuery: string): string {
    return `predictions:high:${serializedQuery}`;
  }

  static predictionByMatch(matchId: string): string {
    return `predictions:match:${matchId}`;
  }

  static teamComparison(hash: string): string {
    return `comparisons:teams:${hash}`;
  }

  static dashboardSummary(): string {
    return 'analytics:dashboard:summary';
  }

  static providerHealth(): string {
    return 'providers:health';
  }

  static providerRateLimit(): string {
    return 'providers:rate-limit';
  }

  static liveMatches(): string {
    return 'live:matches';
  }

  static authLoginAttempt(emailOrIp: string): string {
    return `auth:login-attempt:${emailOrIp}`;
  }
}

