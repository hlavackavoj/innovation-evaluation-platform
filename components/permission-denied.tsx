import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function PermissionDenied({
  title = "Access denied",
  description = "You do not have permission to access this part of CRM."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-lg font-semibold text-rose-900">{title}</h2>
      <p className="mt-2 text-sm text-rose-700">{description}</p>
      <div className="mt-4">
        <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
