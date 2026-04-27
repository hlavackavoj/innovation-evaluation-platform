import { ReactNode } from "react";

export function Shell({
  title,
  description,
  actions,
  children
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-card lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-tealCore">CRM MVP</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
