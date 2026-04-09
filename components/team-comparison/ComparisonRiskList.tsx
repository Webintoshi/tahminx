export function ComparisonRiskList({ risks }: { risks: string[] }) {
  return (
    <div className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
      <h3 className="text-sm font-semibold text-[#ECEDEF]">Riskler</h3>
      {risks.length ? (
        <ul className="mt-3 space-y-2 text-sm text-[#9CA3AF]">
          {risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#9CA3AF]">Belirgin ek risk bayragi gelmedi.</p>
      )}
    </div>
  );
}
