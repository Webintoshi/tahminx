import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";

const guideSections = [
  {
    title: "Sistem nasil calisir",
    text: "TahminX; veri toplama, modelleme, guven skoru hesaplama ve aciklanabilirlik adimlarini sirali olarak calistirir."
  },
  {
    title: "Guven skoru nasil okunur",
    text: "Guven skoru tek basina degil; veri guven seviyesi ve belirsizlik gostergesi ile birlikte yorumlanmalidir."
  },
  {
    title: "Form analizi nasil yorumlanir",
    text: "Son mac trendleri, rakip seviyesi ve ic-dis saha etkisi ayrik olarak degerlendirilir."
  },
  {
    title: "Toplam skor analizi",
    text: "Over/under terimi yerine toplam skor araliklari ve tempo baglamli skor senaryolari kullanilir."
  },
  {
    title: "Yeni baslayanlar icin",
    text: "Ilk adimda Dashboard ozetini takip edin, sonra mac detay sekmelerinden model aciklamasini okuyun."
  }
];

export default function GuidePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Rehber" description="Sistemin calisma mantigi ve yorumlama kilavuzu" />
      <div className="grid gap-4 lg:grid-cols-2">
        {guideSections.map((section) => (
          <SectionCard key={section.title} title={section.title} subtitle="Kullanim notu">
            <p className="text-sm text-[color:var(--muted)]">{section.text}</p>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

