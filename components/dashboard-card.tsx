export function DashboardCard({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-card">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>{label}</span>
      <p className="mt-5 text-4xl font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}
