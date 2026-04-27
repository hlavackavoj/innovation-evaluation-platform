import { Shell } from "@/components/shell";
import { getContacts } from "@/lib/data";

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <Shell
      title="Contacts"
      description="Researchers, students, mentors, evaluators, and other people attached to the innovation pipeline."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-card">
            <p className="text-lg font-semibold text-ink">{contact.name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {contact.role} · {contact.organization?.name ?? "No organization"}
            </p>
            <p className="mt-4 text-sm text-slate-700">{contact.email ?? "No email"}</p>
            <p className="mt-1 text-sm text-slate-700">{contact.phone ?? "No phone"}</p>
            <p className="mt-4 text-sm text-slate-500">
              Linked projects: {contact.projectLinks.map((item) => item.project.title).join(", ") || "None"}
            </p>
            {contact.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{contact.notes}</p> : null}
          </div>
        ))}
      </div>
    </Shell>
  );
}
