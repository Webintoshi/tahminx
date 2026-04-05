import { z } from "zod";

export const sportTypeSchema = z.enum(["football", "basketball"]);
export const matchStatusSchema = z.enum(["upcoming", "live", "completed"]);
export const formResultSchema = z.enum(["W", "D", "L"]);

export const probabilitiesSchema = z.object({
  homeWin: z.number().min(0).max(100),
  draw: z.number().min(0).max(100).optional(),
  awayWin: z.number().min(0).max(100)
});

export const matchPredictionSchema = z.object({
  expectedHome: z.number(),
  expectedAway: z.number(),
  probabilities: probabilitiesSchema,
  confidence: z.number().min(0).max(100),
  modelNote: z.string(),
  riskFlags: z.array(z.string())
});

export const matchEventSchema = z.object({
  minute: z.number().int().min(0),
  team: z.enum(["home", "away"]),
  type: z.enum(["goal", "card", "substitution", "foul", "injury"]),
  description: z.string()
});

export const teamMetricSchema = z.object({
  attack: z.number(),
  defense: z.number(),
  possession: z.number(),
  pace: z.number().optional(),
  efficiency: z.number().optional(),
  xg: z.number().optional()
});

export const matchSchema = z.object({
  id: z.string(),
  sport: sportTypeSchema,
  leagueId: z.string(),
  leagueName: z.string(),
  leagueCountry: z.string(),
  kickoff: z.string(),
  status: matchStatusSchema,
  venue: z.string(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  score: z.object({ home: z.number(), away: z.number() }),
  homeForm: z.array(formResultSchema),
  awayForm: z.array(formResultSchema),
  homeMetrics: teamMetricSchema,
  awayMetrics: teamMetricSchema,
  prediction: matchPredictionSchema,
  events: z.array(matchEventSchema),
  injuries: z.array(z.string())
});

export const standingRowSchema = z.object({
  position: z.number().int(),
  teamId: z.string(),
  team: z.string(),
  played: z.number().int(),
  wins: z.number().int(),
  draws: z.number().int(),
  losses: z.number().int(),
  points: z.number().int(),
  form: z.array(formResultSchema)
});

export const leagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  sport: sportTypeSchema,
  country: z.string(),
  season: z.string(),
  updatedAt: z.string(),
  summary: z.object({
    averageGoalsOrPoints: z.number(),
    homeWinRate: z.number(),
    drawRate: z.number().optional(),
    awayWinRate: z.number()
  }),
  standings: z.array(standingRowSchema),
  upcomingMatchIds: z.array(z.string()),
  recentMatchIds: z.array(z.string())
});

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  sport: sportTypeSchema,
  leagueId: z.string(),
  city: z.string(),
  coach: z.string(),
  founded: z.number().int(),
  form: z.array(formResultSchema),
  homePerformance: z.number(),
  awayPerformance: z.number(),
  attackIndex: z.number(),
  defenseIndex: z.number(),
  roster: z.array(z.string()),
  upcomingMatchIds: z.array(z.string()),
  recentMatchIds: z.array(z.string())
});

export const predictionSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  sport: sportTypeSchema,
  leagueId: z.string(),
  leagueName: z.string(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  kickoff: z.string(),
  expectedScore: z.string(),
  confidence: z.number(),
  risk: z.enum(["low", "medium", "high"]),
  type: z.enum(["winner", "total-score", "first-half", "handicap"]),
  modelExplanation: z.string(),
  probabilities: probabilitiesSchema
});

export const dashboardSchema = z.object({
  todayMatches: z.number().int(),
  liveMatches: z.number().int(),
  highConfidenceCount: z.number().int(),
  updatedLeagues: z.array(leagueSchema),
  highlightedMatches: z.array(matchSchema),
  highlightedPredictions: z.array(predictionSchema),
  systemPerformance: z.object({
    dailyAccuracy: z.number(),
    weeklyAccuracy: z.number(),
    monthlyAccuracy: z.number()
  }),
  teamPerformanceMini: z.array(
    z.object({
      teamId: z.string(),
      team: z.string(),
      values: z.array(z.number())
    })
  )
});

export const performanceRecordSchema = z.object({
  period: z.string(),
  football: z.number(),
  basketball: z.number(),
  overall: z.number()
});

export const modelInsightSchema = z.object({
  id: z.string(),
  name: z.string(),
  confidence: z.number(),
  dataReliability: z.number(),
  uncertainty: z.number(),
  explanation: z.string()
});

export const membershipPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceMonthly: z.number(),
  features: z.array(z.string()),
  recommended: z.boolean().optional()
});

export const accountSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  favoriteLeagues: z.array(z.string()),
  favoriteTeams: z.array(z.string()),
  notifications: z.object({
    liveAlerts: z.boolean(),
    confidenceDropAlerts: z.boolean(),
    weeklyDigest: z.boolean()
  })
});

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: schema,
    meta: z
      .object({
        generatedAt: z.string(),
        source: z.enum(["mock", "api"])
      })
      .optional()
  });

