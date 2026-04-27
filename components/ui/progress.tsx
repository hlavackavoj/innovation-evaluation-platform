import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-200", className)}>
      <div className="h-full rounded-full bg-tealCore transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
