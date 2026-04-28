import { Users } from "lucide-react";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createContactAction, updateContactAction } from "@/app/contacts/actions";
import { getContacts, getOrganizations } from "@/lib/data";

export default async function ContactsPage({
  searchParams
}: {
  searchParams?: { edit?: string };
}) {
  const [contacts, organizations] = await Promise.all([getContacts(), getOrganizations()]);
  const contactToEdit = searchParams?.edit ? contacts.find((contact) => contact.id === searchParams.edit) : undefined;
  const formAction = contactToEdit ? updateContactAction.bind(null, contactToEdit.id) : createContactAction;

  return (
    <Shell
      title="Contacts"
      description="Researchers, students, mentors, evaluators, and other people in the innovation pipeline."
    >
      <div className="mb-5 grid gap-5 lg:grid-cols-[360px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{contactToEdit ? "Edit Contact" : "Add Contact"}</CardTitle>
            <CardDescription>
              Keep project stakeholders and external experts ready for CRM workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContactForm
              action={formAction}
              contact={contactToEdit}
              organizations={organizations}
              submitLabel={contactToEdit ? "Save contact" : "Create contact"}
            />
          </CardContent>
        </Card>
      </div>

      {contacts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{contact.name}</p>
                    <p className="text-xs text-zinc-500">
                      {contact.role}
                      {contact.organization ? ` · ${contact.organization.name}` : ""}
                    </p>
                  </div>
                </div>
                <Link href={`/contacts?edit=${contact.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Edit
                </Link>
              </div>

              <div className="mt-4 space-y-1">
                {contact.email && <p className="text-xs text-zinc-600">{contact.email}</p>}
                {contact.phone && <p className="text-xs text-zinc-600">{contact.phone}</p>}
              </div>

              {contact.projectLinks.length > 0 && (
                <p className="mt-3 text-xs text-zinc-400">
                  Projects: {contact.projectLinks.map((l) => l.project.title).join(", ")}
                </p>
              )}

              {contact.notes && (
                <p className="mt-3 text-xs leading-5 text-zinc-500">{contact.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <Users size={20} className="text-zinc-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-700">No contacts yet</p>
          <p className="mt-1 text-sm text-zinc-500">Contacts appear here once they are linked to projects.</p>
        </div>
      )}
    </Shell>
  );
}
