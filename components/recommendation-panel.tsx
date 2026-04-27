import { Recommendation } from "@/lib/recommendations";

export function RecommendationPanel({ items }: { items: Recommendation[] }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Recommendation Panel</h2>
          <p className="mt-1 text-sm text-slate-600">
            Rule-based recommendations generated from project stage, IP status, and business capability.
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            No urgent recommendations right now. The current project data does not trigger any MVP rules.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-ink">{item.title}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.priority === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.priority} priority
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              <p className="mt-3 text-sm font-medium text-slate-700">
                Suggested support roles: {item.suggestedRoles.join(", ")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
