export function ComparisonMissingDataPanel({ notes }: { notes: string[] }) {
  return (
    <div className="rounded-xl border border-[#2A3035] bg-[#171C1F] p-4">
      <h3 className="text-sm font-semibold text-[#ECEDEF]">Veri eksikleri</h3>
      {notes.length ? (
        <ul className="mt-3 space-y-2 text-sm text-[#9CA3AF]">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#9CA3AF]">Backend bu cevapta belirgin veri eksigi notu donmedi.</p>
      )}
    </div>
  );
}
