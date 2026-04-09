import { TeamComparisonService } from './team-comparison.service';

describe('TeamComparisonService', () => {
  it('rejects same-team comparisons', async () => {
    const service = new TeamComparisonService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.compareTeams({
        homeTeamId: 'team-1',
        awayTeamId: 'team-1',
        window: 'last5',
      } as any),
    ).rejects.toThrow('Same team comparison is not allowed');
  });
});
