import { Injectable } from '@nestjs/common';
import {
  ComparisonEngineResult,
  TeamComparisonCategory,
  TeamComparisonStrengths,
} from '../team-comparison.types';

@Injectable()
export class ComparisonEngineService {
  compare(home: TeamComparisonStrengths, away: TeamComparisonStrengths): ComparisonEngineResult {
    const categories: TeamComparisonCategory[] = [
      this.category('overallStrength', 'Genel guc', home.overall, away.overall),
      this.category('attack', 'Hucum', home.attack, away.attack),
      this.category('defense', 'Savunma', home.defense, away.defense),
      this.category('form', 'Form', home.form, away.form),
      this.category('homeAway', 'Ic saha deplasman', home.home, away.away),
      this.category('tempo', 'Tempo', home.tempo, away.tempo),
      this.category('setPiece', 'Duran top', home.setPiece, away.setPiece),
      this.category('transition', 'Gecis oyunu', home.transition, away.transition),
      this.category('squadIntegrity', 'Kadro butunlugu', home.squad, away.squad),
    ];

    const weightedEdge =
      categories.reduce((sum, category, index) => sum + category.edge * (index === 0 ? 1.5 : 1), 0) /
      (categories.length + 0.5);

    const fieldAdvantages = categories
      .filter((item) => Math.abs(item.edge) >= 8)
      .slice(0, 4)
      .map((item) => `${item.label}: ${item.advantage === 'home' ? 'ev sahibi' : 'deplasman'} lehine`);

    return {
      categories,
      overallEdge: clampEdge(weightedEdge),
      favourite: this.advantage(weightedEdge),
      fieldAdvantages,
    };
  }

  private category(key: string, label: string, homeValue: number, awayValue: number): TeamComparisonCategory {
    const rawEdge = (homeValue - awayValue) * 1.6;
    const edge = clampEdge(rawEdge);
    const advantage = this.advantage(edge);

    return {
      key,
      label,
      homeValue: round2(homeValue),
      awayValue: round2(awayValue),
      edge,
      advantage,
      summary:
        advantage === 'balanced'
          ? `${label} dengeli gorunuyor`
          : `${label} alaninda ${advantage === 'home' ? 'ev sahibi' : 'deplasman'} tarafi onde`,
    };
  }

  private advantage(edge: number): 'home' | 'away' | 'balanced' {
    if (edge >= 6) return 'home';
    if (edge <= -6) return 'away';
    return 'balanced';
  }
}

const clampEdge = (value: number) => Math.max(-100, Math.min(100, round2(value)));
const round2 = (value: number) => Number(value.toFixed(2));
