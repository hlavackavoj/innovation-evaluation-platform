export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-80 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-200" />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
                <div className="h-7 w-12 animate-pulse rounded bg-zinc-200" />
              </div>
              <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content cards */}
      <div className="grid gap-5 xl:grid-cols-[1fr,320px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5">
              <div className="h-5 w-36 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="p-5 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-100 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-48 animate-pulse rounded bg-zinc-200" />
                    <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-zinc-200" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
