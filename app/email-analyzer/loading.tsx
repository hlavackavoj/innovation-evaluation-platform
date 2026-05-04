export default function EmailAnalyzerLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr,420px]">
        {/* Email list */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 p-4 flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-zinc-100" />
          </div>
          <div className="divide-y divide-zinc-100">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 animate-pulse rounded bg-zinc-200" />
                  <div className="h-4 w-20 animate-pulse rounded-full bg-zinc-100 ml-auto" />
                </div>
                <div className="h-3 w-56 animate-pulse rounded bg-zinc-100" />
                <div className="h-3 w-full max-w-sm animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Panel skeleton */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-100" />
            ))}
          </div>
          <div className="border-t border-zinc-100 pt-4 space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
            {[0, 1].map((i) => (
              <div key={i} className="rounded-lg border border-zinc-100 p-3 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
