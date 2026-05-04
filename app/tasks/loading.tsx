export default function TasksLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>

      {/* New task form skeleton */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
        <div className="h-5 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-9 animate-pulse rounded-lg bg-zinc-100" />
          <div className="h-9 animate-pulse rounded-lg bg-zinc-100" />
        </div>
        <div className="h-9 animate-pulse rounded-lg bg-zinc-100" />
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 animate-pulse rounded bg-zinc-100 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
                  <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-100" />
                </div>
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-rose-50 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
