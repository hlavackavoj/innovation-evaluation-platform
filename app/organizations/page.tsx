import { Building2 } from "lucide-react";
import { Shell } from "@/components/shell";
import { getOrganizations } from "@/lib/data";
import { formatEnumLabel } from "@/lib/format";

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <Shell
      title="Organizations"
      description="Universities, faculties, innovation centers, and partner companies connected to the pipeline."
    >
      {organizations.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <Building2 size={16} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{org.name}</p>
                    <p className="text-xs text-zinc-500">{formatEnumLabel(org.type)}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {org.projects.length} project{org.projects.length !== 1 ? "s" : ""}
                </span>
              </div>

              {org.website && <p className="mt-4 text-xs text-indigo-600">{org.website}</p>}

              <p className="mt-2 text-xs text-zinc-400">{org.contacts.length} contact{org.contacts.length !== 1 ? "s" : ""} linked</p>

              {org.notes && (
                <p className="mt-3 text-xs leading-5 text-zinc-500">{org.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <Building2 size={20} className="text-zinc-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-700">No organizations yet</p>
          <p className="mt-1 text-sm text-zinc-500">Organizations appear here once they are linked to projects.</p>
        </div>
      )}
    </Shell>
  );
}
