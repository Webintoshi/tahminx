import { Injectable } from '@nestjs/common';
import { AggregatedTeamProfile, TeamComparisonStrengths } from '../team-comparison.types';

@Injectable()
export class TeamStrengthService {
  calculate(profile: AggregatedTeamProfile): TeamComparisonStrengths {
    const attack = clamp100(
      45 +
        profile.goalsForPerMatch * 14 +
        profile.xgForPerMatch * 10 +
        profile.shotsOnTargetPerMatch * 4 +
        profile.bigChancesPerMatch * 5,
    );

    const defense = clamp100(
      55 +
        (2.2 - profile.goalsAgainstPerMatch) * 18 +
        (2 - profile.xgAgainstPerMatch) * 15 +
        profile.cleanSheetRate * 18,
    );

    const form = clamp100(
      40 + profile.weightedForm * 28 + profile.pointsPerMatch * 12 + profile.scoringRate * 12,
    );

    const home = clamp100(42 + profile.homePointsPerMatch * 15 + profile.homeWinRate * 22);
    const away = clamp100(42 + profile.awayPointsPerMatch * 15 + profile.awayWinRate * 22);
    const tempo = clamp100(35 + profile.shotsPerMatch * 2.2 + profile.possessionPerMatch * 0.35);
    const transition = clamp100(34 + profile.transitionActionsPerMatch * 5 + profile.opponentRankStrength * 7);
    const setPiece = clamp100(34 + profile.setPieceActionsPerMatch * 6 + profile.cornersPerMatch * 3);
    const resilience = clamp100(
      40 + profile.closeGamePointsRate * 24 + profile.cleanSheetRate * 14 + (1.8 - profile.lossRate) * 10,
    );
    const squad = clamp100(
      48 +
        profile.dataQuality * 18 +
        profile.mappingConfidence * 18 +
        (1 - profile.proxyXgUsageRate) * 10 +
        profile.featureCoverage * 6,
    );

    const overall = clamp100(
      attack * 0.2 +
        defense * 0.2 +
        form * 0.16 +
        Math.max(home, away) * 0.08 +
        tempo * 0.07 +
        transition * 0.09 +
        setPiece * 0.07 +
        resilience * 0.07 +
        squad * 0.06,
    );

    return { attack, defense, form, home, away, tempo, transition, setPiece, resilience, squad, overall };
  }
}

const clamp100 = (value: number) => Math.max(0, Math.min(100, round2(value)));
const round2 = (value: number) => Number(value.toFixed(2));
