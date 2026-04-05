-- Performance indexes for read-heavy paths
CREATE INDEX IF NOT EXISTS "Match_matchDate_leagueId_idx" ON "Match" ("matchDate", "leagueId");
CREATE INDEX IF NOT EXISTS "Team_sportId_name_idx" ON "Team" ("sportId", "name");

