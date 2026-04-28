import type { Contact, Organization } from "@prisma/client";

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-400";

export function ContactForm({
  action,
  contact,
  organizations,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  contact?: Contact;
  organizations: Organization[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3">
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Name</span>
        <input name="name" required defaultValue={contact?.name ?? ""} className={inputClass} />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Role</span>
        <input name="role" required defaultValue={contact?.role ?? ""} placeholder="e.g. researcher" className={inputClass} />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Email</span>
        <input type="email" name="email" defaultValue={contact?.email ?? ""} className={inputClass} />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Phone</span>
        <input name="phone" defaultValue={contact?.phone ?? ""} className={inputClass} />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Organization</span>
        <select name="organizationId" defaultValue={contact?.organizationId ?? ""} className={inputClass}>
          <option value="">No organization</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Notes</span>
        <textarea name="notes" rows={4} defaultValue={contact?.notes ?? ""} className={inputClass} />
      </label>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
