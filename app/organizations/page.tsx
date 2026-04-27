import { Shell } from "@/components/shell";
import { getOrganizations } from "@/lib/data";
import { formatEnumLabel } from "@/lib/format";

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <Shell
      title="Organizations"
      description="Universities, faculties, innovation centers, and partner companies connected to CRM projects."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {organizations.map((organization) => (
          <div key={organization.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-ink">{organization.name}</p>
                <p className="mt-1 text-sm text-slate-600">{formatEnumLabel(organization.type)}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {organization.projects.length} projects
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-700">{organization.website ?? "No website listed"}</p>
            <p className="mt-3 text-sm text-slate-500">{organization.contacts.length} contacts linked</p>
            {organization.notes ? <p className="mt-4 text-sm leading-6 text-slate-600">{organization.notes}</p> : null}
          </div>
        ))}
      </div>
    </Shell>
  );
}
