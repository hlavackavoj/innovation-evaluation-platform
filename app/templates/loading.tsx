export default function TemplatesLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="h-5 w-48 animate-pulse rounded bg-zinc-200" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-indigo-100 shrink-0" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
            </div>
            <div className="flex gap-2 pt-1">
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-zinc-100" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
