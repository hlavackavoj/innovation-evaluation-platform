import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/format";

const colorMap: Record<string, string> = {
  HIGH: "bg-rose-100 text-rose-700",
  URGENT: "bg-rose-200 text-rose-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-emerald-100 text-emerald-700",
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-sky-100 text-sky-700",
  DONE: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-200 text-slate-700",
  DISCOVERY: "bg-slate-100 text-slate-700",
  VALIDATION: "bg-amber-100 text-amber-800",
  MVP: "bg-sky-100 text-sky-700",
  SCALING: "bg-teal-100 text-teal-800",
  SPIN_OFF: "bg-violet-100 text-violet-700"
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const normalized = value ?? "UNKNOWN";
  return <Badge className={colorMap[normalized] ?? "bg-slate-100 text-slate-700"}>{formatEnumLabel(normalized)}</Badge>;
}
