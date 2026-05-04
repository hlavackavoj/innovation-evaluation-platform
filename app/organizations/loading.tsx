export default function OrganizationsLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-60 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-zinc-200" />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="divide-y divide-zinc-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-100 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
              </div>
              <div className="h-5 w-12 animate-pulse rounded-full bg-zinc-100 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
