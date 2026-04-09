import { Injectable, NotFoundException } from '@nestjs/common';
import { SportCode } from '@prisma/client';
import { PredictionCalibrationService } from 'src/modules/calibration/prediction-calibration.service';
import { ModelStrategyService } from 'src/modules/model-strategy/model-strategy.service';
import { DefaultConfidenceCalculator } from 'src/modules/predictions/calibration/default-confidence.calculator';
import { FootballEloEngine } from 'src/modules/predictions/engines/football-elo.engine';
import { FootballLogisticEngine } from 'src/modules/predictions/engines/football-logistic.engine';
import { FootballPoissonEngine } from 'src/modules/predictions/engines/football-poisson.engine';
import { PredictionEngineOutput } from 'src/modules/predictions/engines/prediction.interfaces';
import { AggregatedTeamProfile, ComparisonEngineResult, ScenarioEngineResult, ScenarioOutcome } from '../team-comparison.types';

@Injectable()
export class ScenarioEngineService {
  constructor(
    private readonly modelStrategyService: ModelStrategyService,
    private readonly calibrationService: PredictionCalibrationService,
    private readonly confidenceCalculator: DefaultConfidenceCalculator,
    private readonly footballEloEngine: FootballEloEngine,
    private readonly footballPoissonEngine: FootballPoissonEngine,
    private readonly footballLogisticEngine: FootballLogisticEngine,
  ) {}

  async build(input: {
    sportId: string;
    leagueId: string;
    homeTeamId: string;
    awayTeamId: string;
    beforeDate: Date;
    homeProfile: AggregatedTeamProfile;
    awayProfile: AggregatedTeamProfile;
    comparison: ComparisonEngineResult;
  }): Promise<ScenarioEngineResult> {
    const strategy = await this.modelStrategyService.resolveForMatch({
      sportCode: SportCode.FOOTBALL,
      sportId: input.sportId,
      leagueId: input.leagueId,
      predictionType: 'matchOutcome',
    });

    const features = this.buildFeatures(input.homeProfile, input.awayProfile, input.comparison);
    const allOutputs = await Promise.all([
      this.footballEloEngine.previewMatchup({
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        leagueId: input.leagueId,
        beforeDate: input.beforeDate,
      }),
      this.footballPoissonEngine.previewMatchup({
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        beforeDate: input.beforeDate,
      }),
      Promise.resolve(this.footballLogisticEngine.run(features)),
    ]);

    const outputsByModel: Record<'elo' | 'poisson' | 'logistic', PredictionEngineOutput> = {
      elo: allOutputs[0],
      poisson: allOutputs[1],
      logistic: allOutputs[2],
    };

    const validMembers = strategy.ensembleConfig.members
      .filter((member) => member.model === 'elo' || member.model === 'poisson' || member.model === 'logistic')
      .map((member) => ({
        model: member.model as 'elo' | 'poisson' | 'logistic',
        weight: member.weight,
        output: outputsByModel[member.model as 'elo' | 'poisson' | 'logistic'],
      }))
      .filter((member) => member.output);

    if (!validMembers.length) {
      throw new NotFoundException('No valid football ensemble members found for comparison');
    }

    const normalizedMembers = normalizeMembers(validMembers);
    const probabilities = normalizeDistribution(
      normalizedMembers.reduce(
        (acc, item) => {
          acc.homeWin += item.output.probabilities.homeWin * item.weight;
          acc.draw += item.output.probabilities.draw * item.weight;
          acc.awayWin += item.output.probabilities.awayWin * item.weight;
          return acc;
        },
        { homeWin: 0, draw: 0, awayWin: 0 },
      ),
    );

    const expectedScore = normalizedMembers.reduce(
      (acc, item) => {
        acc.home += item.output.expectedScore.home * item.weight;
        acc.away += item.output.expectedScore.away * item.weight;
        return acc;
      },
      { home: 0, away: 0 },
    );

    const rawConfidence = this.confidenceCalculator.score(features, {
      probabilities,
      expectedScore,
    } as PredictionEngineOutput);

    const calibration = await this.calibrationService.calibrateProbabilities({
      modelVersionId: strategy.primaryModelVersionId,
      sport: SportCode.FOOTBALL,
      predictionType: 'matchOutcome1x2',
      probabilities,
      rawConfidence: rawConfidence / 100,
      calibrationProfileId: strategy.calibrationProfileId,
    });

    const calibratedProbabilities = normalizeDistribution(calibration.probabilities);
    const overTendency = probabilityOver25(expectedScore.home, expectedScore.away);
    const bttsTendency = probabilityBtts(expectedScore.home, expectedScore.away);

    return {
      probabilities: {
        homeEdge: round2(calibratedProbabilities.homeWin * 100),
        drawTendency: round2(calibratedProbabilities.draw * 100),
        awayThreatLevel: round2(calibratedProbabilities.awayWin * 100),
        overTendency: round2(overTendency * 100),
        bttsTendency: round2(bttsTendency * 100),
        topScorelines: topScorelines(expectedScore.home, expectedScore.away),
      },
      scenarios: buildScenarios({
        homeProbability: calibratedProbabilities.homeWin,
        awayProbability: calibratedProbabilities.awayWin,
        drawProbability: calibratedProbabilities.draw,
        overTendency,
        bttsTendency,
        comparison: input.comparison,
      }),
      modelOutputs: normalizedMembers.map((item) => ({
        model: item.model,
        weight: round4(item.weight),
        output: item.output,
      })),
      rawConfidence: rawConfidence / 100,
      calibratedConfidence: calibration.calibratedConfidence,
      modelDisagreement: calculateDisagreement(normalizedMembers.map((item) => item.output.probabilities)),
    };
  }

  private buildFeatures(
    homeProfile: AggregatedTeamProfile,
    awayProfile: AggregatedTeamProfile,
    comparison: ComparisonEngineResult,
  ): Record<string, number> {
    return {
      recentFormScore: round4(homeProfile.weightedForm - awayProfile.weightedForm),
      homeAwayStrength: round4(homeProfile.homePointsPerMatch - awayProfile.awayPointsPerMatch),
      opponentStrengthDiff: round4((awayProfile.rank ?? 10) - (homeProfile.rank ?? 10)),
      tableRank: Number(homeProfile.rank ?? 10),
      avgGoalsFor: round4((homeProfile.goalsForPerMatch + awayProfile.goalsForPerMatch) / 2),
      avgGoalsAgainst: round4((homeProfile.goalsAgainstPerMatch + awayProfile.goalsAgainstPerMatch) / 2),
      missingPlayersCount: 0,
      comparisonEdge: round4(comparison.overallEdge / 100),
    };
  }
}

const normalizeMembers = <T extends { weight: number }>(members: T[]) => {
  const totalWeight = members.reduce((sum, item) => sum + Math.max(0, item.weight), 0) || 1;
  return members.map((item) => ({
    ...item,
    weight: Math.max(0, item.weight) / totalWeight,
  }));
};

const normalizeDistribution = (value: { homeWin: number; draw: number; awayWin: number }) => {
  const total = value.homeWin + value.draw + value.awayWin;
  if (!total) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: value.homeWin / total,
    draw: value.draw / total,
    awayWin: value.awayWin / total,
  };
};

const probabilityOver25 = (homeGoals: number, awayGoals: number) => {
  const total = Math.max(0.2, homeGoals + awayGoals);
  return clamp01(1 - Math.exp(-Math.max(0, total - 1.8)));
};

const probabilityBtts = (homeGoals: number, awayGoals: number) => {
  return clamp01((1 - Math.exp(-Math.max(0.2, homeGoals))) * (1 - Math.exp(-Math.max(0.2, awayGoals))));
};

const topScorelines = (lambdaHome: number, lambdaAway: number) => {
  const rows: Array<{ score: string; probability: number }> = [];
  for (let home = 0; home <= 4; home += 1) {
    for (let away = 0; away <= 4; away += 1) {
      rows.push({
        score: `${home}-${away}`,
        probability: poisson(lambdaHome, home) * poisson(lambdaAway, away),
      });
    }
  }

  return rows
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5)
    .map((item) => ({ score: item.score, probability: round2(item.probability * 100) }));
};

const buildScenarios = (input: {
  homeProbability: number;
  awayProbability: number;
  drawProbability: number;
  overTendency: number;
  bttsTendency: number;
  comparison: ComparisonEngineResult;
}): ScenarioOutcome[] => {
  const favorite = input.comparison.favourite;
  const homeStrong = input.homeProbability >= 0.5 && input.comparison.overallEdge >= 10;
  const awayThreat = input.awayProbability >= 0.34 || input.comparison.overallEdge <= -10;

  const scenarios: ScenarioOutcome[] = [
    {
      name: 'Dominant Home',
      probabilityScore: round2((homeStrong ? 0.55 : 0.3 + input.homeProbability * 0.4) * 100),
      favoredSide: homeStrong ? 'home' : favorite,
      reasons: ['Ev sahibi guc farki ve son form sinyalleri one cikiyor'],
      supportingSignals: input.comparison.fieldAdvantages.slice(0, 2),
    },
    {
      name: 'Balanced',
      probabilityScore: round2((0.18 + input.drawProbability * 0.8) * 100),
      favoredSide: 'balanced',
      reasons: ['Kategori farklari sinirli kaliyor'],
      supportingSignals: ['Beraberlik egilimi gorece yuksek'],
    },
    {
      name: 'Transition Threat',
      probabilityScore: round2((0.2 + Math.max(0.1, input.bttsTendency) * 0.45) * 100),
      favoredSide: awayThreat ? 'away' : favorite,
      reasons: ['Gecis oyunu ve alan kullanimi mac akisini etkileyebilir'],
      supportingSignals: input.comparison.fieldAdvantages.filter((item) => item.toLowerCase().includes('gecis')).slice(0, 2),
    },
    {
      name: 'High Scoring',
      probabilityScore: round2((0.18 + input.overTendency * 0.7) * 100),
      favoredSide: favorite,
      reasons: ['Beklenen gol toplami acik oyun ihtimalini destekliyor'],
      supportingSignals: ['Over egilimi yukseliyor', 'BTTS sinyali destek veriyor'],
    },
    {
      name: 'Controlled Match',
      probabilityScore: round2((0.24 + (1 - input.overTendency) * 0.5 + input.drawProbability * 0.2) * 100),
      favoredSide: 'balanced',
      reasons: ['Skor temposu kontrol altinda kalabilir'],
      supportingSignals: ['Daha temkinli tempo profili'],
    },
  ];

  return scenarios
    .sort((a, b) => b.probabilityScore - a.probabilityScore)
    .slice(0, 5);
};

const calculateDisagreement = (distributions: Array<{ homeWin: number; draw: number; awayWin: number }>) => {
  if (distributions.length <= 1) {
    return 0;
  }

  const diffs: number[] = [];
  for (let i = 0; i < distributions.length; i += 1) {
    for (let j = i + 1; j < distributions.length; j += 1) {
      diffs.push(avgAbsDiff(distributions[i], distributions[j]));
    }
  }

  return diffs.length ? round4(diffs.reduce((sum, value) => sum + value, 0) / diffs.length) : 0;
};

const avgAbsDiff = (
  a: { homeWin: number; draw: number; awayWin: number },
  b: { homeWin: number; draw: number; awayWin: number },
) => (Math.abs(a.homeWin - b.homeWin) + Math.abs(a.draw - b.draw) + Math.abs(a.awayWin - b.awayWin)) / 3;

const poisson = (lambda: number, k: number): number => (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
const factorial = (n: number): number => {
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round2 = (value: number) => Number(value.toFixed(2));
const round4 = (value: number) => Number(value.toFixed(4));
