import type { SeasonListItem, TeamComparisonResponse } from "@/types/api-contract";

const now = new Date();

const toIso = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const seasonsMock: SeasonListItem[] = [
  {
    id: "season-super-lig-2025",
    leagueId: "l-super-lig",
    seasonYear: 2025,
    name: "2025/26",
    startDate: toIso(-240, 20),
    endDate: toIso(120, 20),
    isCurrent: true
  },
  {
    id: "season-super-lig-2024",
    leagueId: "l-super-lig",
    seasonYear: 2024,
    name: "2024/25",
    startDate: toIso(-600, 20),
    endDate: toIso(-260, 20),
    isCurrent: false
  },
  {
    id: "season-premier-2025",
    leagueId: "l-premier-league",
    seasonYear: 2025,
    name: "2025/26",
    startDate: toIso(-240, 20),
    endDate: toIso(120, 20),
    isCurrent: true
  }
];

export const teamComparisonMock: TeamComparisonResponse = {
  header: {
    homeTeam: {
      id: "t-gs",
      name: "Galatasaray",
      shortName: "GS",
      logoUrl: null,
      country: "Turkiye"
    },
    awayTeam: {
      id: "t-fb",
      name: "Fenerbahce",
      shortName: "FB",
      logoUrl: null,
      country: "Turkiye"
    },
    comparisonDate: toIso(0, 18, 45),
    dataWindow: "last5",
    confidenceScore: 71,
    leagueContext: "Super Lig",
    cacheHit: true
  },
  comparison: {
    overallStrength: {
      key: "overall",
      label: "Genel guc",
      homeScore: 58,
      awayScore: 42,
      edge: 16,
      winner: "home",
      winnerLabel: "Ev sahibi onde",
      explanation: "Toplam sinyal paketi ev sahibi taraf lehine bir miktar daha guclu."
    },
    attack: {
      key: "attack",
      label: "Hucum",
      homeScore: 78,
      awayScore: 71,
      edge: 7,
      winner: "home",
      winnerLabel: "Ev sahibi onde",
      explanation: "Son maclardaki ceza sahasi uretimi ev sahibi lehine ayrisiyor."
    },
    defense: {
      key: "defense",
      label: "Savunma",
      homeScore: 67,
      awayScore: 65,
      edge: 2,
      winner: "balanced",
      winnerLabel: "Denge",
      explanation: "Savunma sinyalleri yakin seviyede."
    },
    form: {
      key: "form",
      label: "Form",
      homeScore: 74,
      awayScore: 61,
      edge: 13,
      winner: "home",
      winnerLabel: "Ev sahibi onde",
      explanation: "Form trendi ev sahibi lehine daha stabil."
    },
    homeAway: {
      key: "venue",
      label: "Ic saha / deplasman",
      homeScore: 80,
      awayScore: 64,
      edge: 16,
      winner: "home",
      winnerLabel: "Ev sahibi onde",
      explanation: "Ev sahibi saha etkisini daha net uretiyor."
    },
    tempo: {
      key: "tempo",
      label: "Tempo",
      homeScore: 59,
      awayScore: 63,
      edge: -4,
      winner: "away",
      winnerLabel: "Deplasman onde",
      explanation: "Deplasmanin gecis hizi tempoyu yukari cekebilir."
    },
    setPiece: {
      key: "set_piece",
      label: "Duran top",
      homeScore: 66,
      awayScore: 60,
      edge: 6,
      winner: "home",
      winnerLabel: "Ev sahibi onde",
      explanation: "Duran top kalitesi ev sahibi taraf lehine."
    },
    transition: {
      key: "transition",
      label: "Gecis oyunu",
      homeScore: 62,
      awayScore: 68,
      edge: -6,
      winner: "away",
      winnerLabel: "Deplasman onde",
      explanation: "Acik alan kosulari deplasmanin en net cevabi olabilir."
    },
    squadIntegrity: {
      key: "squad",
      label: "Kadro butunlugu",
      homeScore: 69,
      awayScore: 64,
      edge: 5,
      winner: "home",
      winnerLabel: "Ev sahibi onde",
      explanation: "Kadro devamliligi ev sahibi lehine biraz daha temiz."
    }
  },
  probabilities: {
    homeEdge: 44,
    drawTendency: 27,
    awayThreatLevel: 29,
    overTendency: 56,
    bttsTendency: 59,
    topScorelines: [
      { score: "1-0", probability: 14.4 },
      { score: "1-1", probability: 12.9 },
      { score: "2-1", probability: 11.6 },
      { score: "2-0", probability: 9.2 },
      { score: "0-0", probability: 7.8 }
    ],
    expectedScore: {
      home: 1.68,
      away: 1.21
    }
  },
  scenarios: [
    {
      name: "dominant home",
      probabilityScore: 44,
      favoredSide: "home",
      reasons: ["Ev sahibi form, mekan ve ceza sahasi uretiminde onde."],
      supportingSignals: ["Form", "Ic saha / deplasman"]
    },
    {
      name: "balanced",
      probabilityScore: 28,
      favoredSide: "balanced",
      reasons: ["Savunma ve tempo sinyalleri maci uzun sure dengede tutabilir."],
      supportingSignals: ["Savunma", "Tempo"]
    },
    {
      name: "transition threat",
      probabilityScore: 36,
      favoredSide: "away",
      reasons: ["Deplasmanin gecis kalitesi oyunu aniden cevirebilir."],
      supportingSignals: ["Gecis oyunu"]
    }
  ],
  explanation: {
    shortComment: "Galatasaray tarafi bir miktar onde gorunuyor; temel fark form ve saha baglaminda toplanmis durumda.",
    detailedComment: "Model dagilimi ev sahibine daha yuksek bir kenar veriyor ancak gecis oyunu ve derby oynakligi macin bir kisim fazlarinda dengeyi koruyabilir.",
    expertComment: "Uretilen edge kesinlik degil. Hucum verimi ile ic saha etkisi ev sahibine arti yazarken deplasmanin gecis tehdidi varyansi yukari cekiyor.",
    risks: ["Derby oynakligi hala yuksek.", "Model uzlasisi tam degil."],
    missingDataNotes: ["xG verisinin bir bolumu proxy hesap ile desteklendi."],
    confidenceNote: "Guven skoru orta-yuksek bantta; yine de sonuc olasilik temelli okunmali."
  },
  confidence: {
    score: 71,
    band: "medium",
    dataQuality: 76,
    dataCoverage: 74,
    windowConsistency: 92,
    mappingConfidence: 81
  },
  metadata: {
    usedMatches: {
      home: ["m101", "m102", "m103", "m104", "m105"],
      away: ["m201", "m202", "m203", "m204", "m205"]
    },
    usedWindows: {
      home: 5,
      away: 5
    },
    usedFeatureSet: "comparison-core",
    generatedAt: toIso(0, 18, 45),
    cacheHit: true,
    cacheSource: "redis",
    cacheExpiresAt: toIso(0, 18, 55),
    crossLeague: false,
    warnings: ["Derby oynakligi", "Proxy xG aktif"]
  },
  visualization: {
    attackScore: 78,
    defenseScore: 67,
    formScore: 74,
    homeAwayScore: 80,
    tempoScore: 59,
    transitionScore: 62,
    setPieceScore: 66,
    resilienceScore: 68,
    homeValues: {
      attackScore: 78,
      defenseScore: 67,
      formScore: 74,
      homeAwayScore: 80,
      tempoScore: 59,
      transitionScore: 62,
      setPieceScore: 66,
      resilienceScore: 68
    },
    awayValues: {
      attackScore: 71,
      defenseScore: 65,
      formScore: 61,
      homeAwayScore: 64,
      tempoScore: 63,
      transitionScore: 68,
      setPieceScore: 60,
      resilienceScore: 63
    }
  }
};
