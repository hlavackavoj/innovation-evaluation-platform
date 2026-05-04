export default function ProjectsLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-200" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 animate-pulse rounded-full bg-indigo-100" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
                </div>
                <div className="h-5 w-72 animate-pulse rounded bg-zinc-200" />
                <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-100" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-lg bg-zinc-100 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
