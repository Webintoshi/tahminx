export const QUEUE_NAMES = {
  INGESTION: 'ingestion',
  PREDICTION: 'prediction',
  HEALTH: 'health',
  BACKUP: 'backup',
  DEAD_LETTER: 'dead-letter',
} as const;

export const JOB_NAMES = {
  syncSports: 'syncSports',
  syncLeagues: 'syncLeagues',
  syncSeasons: 'syncSeasons',
  syncTeams: 'syncTeams',
  syncPlayers: 'syncPlayers',
  syncFixtures: 'syncFixtures',
  syncResults: 'syncResults',
  syncStandings: 'syncStandings',
  syncTeamStats: 'syncTeamStats',
  syncPlayerStats: 'syncPlayerStats',
  syncMatchEvents: 'syncMatchEvents',
  generateFeatures: 'generateFeatures',
  generatePredictions: 'generatePredictions',
  recalculateForms: 'recalculateForms',
  providerHealthCheck: 'providerHealthCheck',
  syncSupabaseBackup: 'syncSupabaseBackup',
} as const;
