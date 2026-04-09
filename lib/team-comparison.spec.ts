import {
  buildTeamComparisonSearch,
  getTeamComparisonValidationMessage,
  parseTeamComparisonQuery
} from "@/lib/team-comparison";

describe("team comparison query helpers", () => {
  it("loads form state from query params", () => {
    const state = parseTeamComparisonQuery({
      homeTeamId: "t-gs",
      awayTeamId: "t-fb",
      leagueId: "l-super-lig",
      seasonId: "season-super-lig-2025",
      window: "last10"
    });

    expect(state.homeTeamId).toBe("t-gs");
    expect(state.awayTeamId).toBe("t-fb");
    expect(state.leagueId).toBe("l-super-lig");
    expect(state.seasonId).toBe("season-super-lig-2025");
    expect(state.window).toBe("last10");
  });

  it("builds a stable search string", () => {
    const search = buildTeamComparisonSearch({
      homeTeamId: "t-gs",
      awayTeamId: "t-fb",
      leagueId: "",
      seasonId: "",
      window: "last5"
    });

    expect(search).toContain("homeTeamId=t-gs");
    expect(search).toContain("awayTeamId=t-fb");
    expect(search).toContain("window=last5");
  });

  it("returns validation error for same team", () => {
    expect(
      getTeamComparisonValidationMessage({
        homeTeamId: "t-gs",
        awayTeamId: "t-gs",
        leagueId: "",
        seasonId: "",
        window: "last5"
      })
    ).toBe("Ayni takim iki kez secilemez.");
  });
});
