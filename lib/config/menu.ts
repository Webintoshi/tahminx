export interface MenuItem {
  title: string;
  href: string;
  description?: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const sidebarMenu: MenuSection[] = [
  {
    title: "Genel",
    items: [
      { title: "Anasayfa", href: "/dashboard", description: "Ozet ve canli durum" },
      { title: "Maclar", href: "/matches", description: "Takvim ve durum filtreleri" },
      { title: "Tahminler", href: "/predictions", description: "Model ciktilari" },
      { title: "Canli Analiz", href: "/live", description: "Canli istatistik akisi" }
    ]
  },
  {
    title: "Futbol",
    items: [
      { title: "Futbol Analizi", href: "/football" },
      { title: "Mac On Analiz", href: "/football/pre-match" },
      { title: "Takim Karsilastirma", href: "/football/team-comparison" },
      { title: "Form Analizi", href: "/football/form-analysis" },
      { title: "Gol Beklentisi", href: "/football/goal-expectation" }
    ]
  },
  {
    title: "Basketbol",
    items: [
      { title: "Basketbol Analizi", href: "/basketball" },
      { title: "Mac On Analiz", href: "/basketball/pre-match" },
      { title: "Takim Karsilastirma", href: "/basketball/team-comparison" },
      { title: "Tempo", href: "/basketball/pace" },
      { title: "Verimlilik", href: "/basketball/efficiency" },
      { title: "Ceyrek Analizi", href: "/basketball/quarters" }
    ]
  },
  {
    title: "Veri Modulleri",
    items: [
      { title: "Ligler", href: "/leagues" },
      { title: "Takimlar", href: "/teams" },
      { title: "Modeller", href: "/models" },
      { title: "Performans", href: "/performance" },
      { title: "Rehber", href: "/guide" }
    ]
  },
  {
    title: "Admin",
    items: [
      { title: "Calibration", href: "/admin/calibration", description: "Model calibration sonuclari" },
      { title: "Risk Monitor", href: "/admin/risk-monitor", description: "Risk dagilimi ve bayraklar" },
      { title: "Low Confidence", href: "/admin/low-confidence", description: "Dusuk guvenli prediction listesi" },
      { title: "Model Comparison", href: "/admin/models/comparison", description: "Model versiyon karsilastirmasi" },
      { title: "Feature Importance", href: "/admin/models/feature-importance", description: "Ozellik katki agirliklari" },
      { title: "Failed Predictions", href: "/admin/predictions/failed", description: "Yanlis tahmin analizi" },
      { title: "Model Performance", href: "/admin/models/performance", description: "Zaman serisi performans trendi" },
      { title: "Model Drift", href: "/admin/models/drift", description: "Performance ve calibration drift ozeti" },
      { title: "Strategies", href: "/admin/models/strategies", description: "Model strategy yonetimi" },
      { title: "Ensemble Config", href: "/admin/models/ensemble", description: "Ensemble agirlik kontrol paneli" },
      { title: "Feature Lab", href: "/admin/features/lab", description: "Feature group ve set yonetimi" },
      { title: "Feature Experiments", href: "/admin/features/experiments", description: "Feature experiment sonuclari" }
    ]
  },
  {
    title: "Hesap",
    items: [
      { title: "Uyelik", href: "/membership" },
      { title: "Hesabim", href: "/account" }
    ]
  }
];
