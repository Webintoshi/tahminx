import { Injectable } from '@nestjs/common';
import { ComparisonEngineResult, ScenarioEngineResult } from '../team-comparison.types';

@Injectable()
export class ExplanationEngineService {
  build(input: {
    homeTeamName: string;
    awayTeamName: string;
    comparison: ComparisonEngineResult;
    scenario: ScenarioEngineResult;
    confidence: {
      score: number;
      band: string;
      riskFlags: string[];
    };
    missingDataNotes: string[];
    crossLeague: boolean;
  }) {
    const topCategory = input.comparison.categories
      .filter((item) => item.advantage !== 'balanced')
      .sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))[0];

    const shortComment = topCategory
      ? `${topCategory.label} alanindaki fark ${topCategory.advantage === 'home' ? input.homeTeamName : input.awayTeamName} tarafina hafif bir avantaj verebilir.`
      : `${input.homeTeamName} ile ${input.awayTeamName} arasindaki veriler dengeli bir profile isaret ediyor.`;

    const detailedParts = [
      `${input.homeTeamName} ve ${input.awayTeamName} karsilastirmasi son veri penceresi uzerinden uretildi.`,
      topCategory ? `${topCategory.label} farki temel ayrisici sinyal olarak one cikiyor.` : 'Kategori bazli farklar sinirli kaliyor.',
      `Model ciktilari ev sahibi, beraberlik ve deplasman tehdidini birlikte degerlendiriyor.`,
      input.crossLeague ? 'Farkli lig baglami yorumu zorlastirabilir.' : null,
      input.confidence.band === 'low' ? 'Guven seviyesi dusuk oldugu icin yorumlar temkinli okunmali.' : null,
    ].filter(Boolean);

    const expertParts = [
      input.scenario.scenarios[0]
        ? `En olasi senaryo ${input.scenario.scenarios[0].name.toLowerCase()} olarak gorunuyor.`
        : 'Senaryo motoru belirgin bir oyun akisi ayrisimi uretmedi.',
      input.comparison.fieldAdvantages.length ? input.comparison.fieldAdvantages.join(', ') : 'Belirgin saha ici ustunluk sinyali sinirli.',
      input.missingDataNotes.length ? `Eksik veri notlari: ${input.missingDataNotes.join('; ')}.` : null,
      input.confidence.riskFlags.length ? `Risk bayraklari: ${input.confidence.riskFlags.join(', ')}.` : null,
    ].filter(Boolean);

    return {
      shortComment,
      detailedComment: detailedParts.join(' '),
      expertComment: expertParts.join(' '),
      risks: input.confidence.riskFlags,
      missingDataNotes: input.missingDataNotes,
      confidenceNote:
        input.confidence.band === 'high'
          ? 'Veri kapsami ve model uyumu gorece iyi gorunuyor, yine de sonuc dili kesin okunmamali.'
          : input.confidence.band === 'medium'
            ? 'Veri ve model uyumu kullanilabilir seviyede; marjinal farklar yorumu degistirebilir.'
            : 'Veri kapsami veya model uyumu sinirli oldugu icin bu karsilastirma daha ihtiyatli okunmali.',
    };
  }
}
