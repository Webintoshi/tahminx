import { fireEvent, render, screen } from "@testing-library/react";
import { TeamComparisonForm } from "@/components/team-comparison/TeamComparisonForm";

describe("TeamComparisonForm", () => {
  it("shows validation state and keeps submit disabled", () => {
    render(
      <TeamComparisonForm
        form={{
          homeTeamId: "t-gs",
          awayTeamId: "t-gs",
          leagueId: "",
          seasonId: "",
          window: "last5"
        }}
        teams={[
          { id: "t-gs", name: "Galatasaray", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football" }
        ]}
        leagues={[]}
        seasons={[]}
        onChange={() => undefined}
        onSubmit={() => undefined}
        disabled
        validationMessage="Ayni takim iki kez secilemez."
      />
    );

    expect(screen.getByText("Ayni takim iki kez secilemez.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Karsilastir" })).toBeDisabled();
  });

  it("emits submit when form is valid", () => {
    const onSubmit = vi.fn();

    render(
      <TeamComparisonForm
        form={{
          homeTeamId: "t-gs",
          awayTeamId: "t-fb",
          leagueId: "",
          seasonId: "",
          window: "last5"
        }}
        teams={[
          { id: "t-gs", name: "Galatasaray", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football" },
          { id: "t-fb", name: "Fenerbahce", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football" }
        ]}
        leagues={[]}
        seasons={[]}
        onChange={() => undefined}
        onSubmit={onSubmit}
        disabled={false}
      />
    );

    fireEvent.submit(screen.getByRole("button", { name: "Karsilastir" }).closest("form") as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
