export default function ProjectDetailLoading() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-80 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200" />
      </div>

      {/* Pipeline stepper */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="h-7 w-7 animate-pulse rounded-full bg-zinc-200 shrink-0" />
              {i < 4 && <div className="h-0.5 flex-1 animate-pulse bg-zinc-100" />}
            </div>
          ))}
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-indigo-100" />
        <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-100" />
      </div>

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr,320px]">
        <div className="space-y-5">
          {/* Overview card */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5 space-y-3">
              <div className="flex gap-2">
                <div className="h-5 w-20 animate-pulse rounded-full bg-indigo-100" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
              </div>
              <div className="h-5 w-56 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-full max-w-lg animate-pulse rounded bg-zinc-100" />
            </div>
            <div className="p-5 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg bg-zinc-50 p-3.5 space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Activities card */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5">
              <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="p-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-100 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-zinc-200" />
                    <div className="h-3 w-56 animate-pulse rounded bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
              <div className="h-5 w-28 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
