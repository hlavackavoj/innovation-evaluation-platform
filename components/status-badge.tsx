import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/format";

const colorMap: Record<string, string> = {
  HIGH: "bg-rose-50 text-rose-700 border-rose-200",
  URGENT: "bg-rose-100 text-rose-800 border-rose-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TODO: "bg-zinc-100 text-zinc-600 border-zinc-200",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISMISSED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  DISCOVERY: "bg-zinc-100 text-zinc-700 border-zinc-200",
  VALIDATION: "bg-amber-50 text-amber-700 border-amber-200",
  MVP: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SCALING: "bg-violet-50 text-violet-700 border-violet-200",
  SPIN_OFF: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WEAK: "bg-rose-50 text-rose-700 border-rose-200",
  EMERGING: "bg-amber-50 text-amber-700 border-amber-200",
  STRONG: "bg-emerald-50 text-emerald-700 border-emerald-200"
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const normalized = value ?? "UNKNOWN";
  return (
    <Badge className={colorMap[normalized] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}>
      {formatEnumLabel(normalized)}
    </Badge>
  );
}
