import { render, screen } from "@testing-library/react";
import { TeamComparisonPageClient } from "@/app/compare/teams/team-comparison-page-client";
import { teamComparisonMock } from "@/lib/api/mock-team-comparison-data";

const mockUseLeagues = vi.fn();
const mockUseTeams = vi.fn();
const mockUseSeasons = vi.fn();
const mockUseTeamComparison = vi.fn();

vi.mock("@/lib/hooks/use-api", () => ({
  useLeagues: (...args: unknown[]) => mockUseLeagues(...args),
  useTeams: (...args: unknown[]) => mockUseTeams(...args),
  useSeasons: (...args: unknown[]) => mockUseSeasons(...args)
}));

vi.mock("@/lib/hooks/use-team-comparison", () => ({
  useTeamComparison: (...args: unknown[]) => mockUseTeamComparison(...args)
}));

describe("TeamComparisonPageClient", () => {
  beforeEach(() => {
    mockUseLeagues.mockReturnValue({
      data: {
        data: [{ id: "l-super-lig", name: "Super Lig", country: "TR", season: "2025/26", sportId: "s-football", sportKey: "football" }]
      },
      isLoading: false
    });
    mockUseTeams.mockReturnValue({
      data: {
        data: [
          { id: "t-gs", name: "Galatasaray", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football" },
          { id: "t-fb", name: "Fenerbahce", leagueId: "l-super-lig", sportId: "s-football", sportKey: "football" }
        ]
      },
      isLoading: false
    });
    mockUseSeasons.mockReturnValue({
      data: {
        data: [{ id: "season-super-lig-2025", leagueId: "l-super-lig", seasonYear: 2025, name: "2025/26", isCurrent: true }]
      },
      isLoading: false
    });
    mockUseTeamComparison.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn()
    });
  });

  it("loads query params into form state", () => {
    render(
      <TeamComparisonPageClient
        initialQuery={{
          homeTeamId: "t-gs",
          awayTeamId: "t-fb",
          leagueId: "l-super-lig",
          seasonId: "season-super-lig-2025",
          window: "last10"
        }}
      />
    );

    expect(screen.getByLabelText("Ev sahibi takim")).toHaveValue("t-gs");
    expect(screen.getByLabelText("Deplasman takim")).toHaveValue("t-fb");
    expect(screen.getByLabelText("Lig")).toHaveValue("l-super-lig");
    expect(screen.getByLabelText("Sezon")).toHaveValue("season-super-lig-2025");
  });

  it("renders loading state", () => {
    mockUseTeamComparison.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: vi.fn()
    });

    const { container } = render(
      <TeamComparisonPageClient
        initialQuery={{
          homeTeamId: "t-gs",
          awayTeamId: "t-fb",
          leagueId: "",
          seasonId: "",
          window: "last5"
        }}
      />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders error state", () => {
    mockUseTeamComparison.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("Backend error"),
      refetch: vi.fn()
    });

    render(
      <TeamComparisonPageClient
        initialQuery={{
          homeTeamId: "t-gs",
          awayTeamId: "t-fb",
          leagueId: "",
          seasonId: "",
          window: "last5"
        }}
      />
    );

    expect(screen.getByText("Team comparison yuklenemedi")).toBeInTheDocument();
    expect(screen.getByText("Backend error")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(
      <TeamComparisonPageClient
        initialQuery={{
          homeTeamId: "",
          awayTeamId: "",
          leagueId: "",
          seasonId: "",
          window: "last5"
        }}
      />
    );

    expect(screen.getByText("Karsilastirma hazir degil")).toBeInTheDocument();
  });

  it("renders low confidence warning state", () => {
    mockUseTeamComparison.mockReturnValue({
      data: {
        data: {
          ...teamComparisonMock,
          confidence: {
            ...teamComparisonMock.confidence,
            band: "low",
            score: 48
          }
        }
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn()
    });

    render(
      <TeamComparisonPageClient
        initialQuery={{
          homeTeamId: "t-gs",
          awayTeamId: "t-fb",
          leagueId: "",
          seasonId: "",
          window: "last5"
        }}
      />
    );

    expect(screen.getByText("Guven skoru dusuk; bu cevap daha ihtiyatli okunmali.")).toBeInTheDocument();
  });

  it("renders successful comparison", () => {
    mockUseTeamComparison.mockReturnValue({
      data: { data: teamComparisonMock },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn()
    });

    render(
      <TeamComparisonPageClient
        initialQuery={{
          homeTeamId: "t-gs",
          awayTeamId: "t-fb",
          leagueId: "",
          seasonId: "",
          window: "last5"
        }}
      />
    );

    expect(screen.getAllByText("Galatasaray").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fenerbahce").length).toBeGreaterThan(0);
    expect(screen.getByText("Main comparison")).toBeInTheDocument();
    expect(screen.getByText("dominant home")).toBeInTheDocument();
    expect(screen.getByText("Top 5 scorelines")).toBeInTheDocument();
  });
});
