import { z } from "zod";
import {
  accountSchema,
  dashboardSchema,
  leagueSchema,
  matchSchema,
  membershipPlanSchema,
  modelInsightSchema,
  performanceRecordSchema,
  predictionSchema,
  teamSchema
} from "@/lib/api/schemas";

export type MatchDto = z.infer<typeof matchSchema>;
export type LeagueDto = z.infer<typeof leagueSchema>;
export type TeamDto = z.infer<typeof teamSchema>;
export type PredictionDto = z.infer<typeof predictionSchema>;
export type DashboardDto = z.infer<typeof dashboardSchema>;
export type PerformanceRecordDto = z.infer<typeof performanceRecordSchema>;
export type ModelInsightDto = z.infer<typeof modelInsightSchema>;
export type MembershipPlanDto = z.infer<typeof membershipPlanSchema>;
export type AccountDto = z.infer<typeof accountSchema>;

