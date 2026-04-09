import { TeamComparisonPageClient } from "@/app/compare/teams/team-comparison-page-client";
import { parseTeamComparisonQuery } from "@/lib/team-comparison";

export default async function CompareTeamsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <TeamComparisonPageClient initialQuery={parseTeamComparisonQuery(params)} currentPath="/compare/teams" />;
}
