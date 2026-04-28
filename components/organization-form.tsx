import type { Organization } from "@prisma/client";
import { organizationTypeOptions } from "@/lib/constants";
import { formatEnumLabel } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-400";

export function OrganizationForm({
  action,
  organization,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  organization?: Organization;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-3">
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Name</span>
        <input name="name" required defaultValue={organization?.name ?? ""} className={inputClass} />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Type</span>
        <select name="type" defaultValue={organization?.type ?? organizationTypeOptions[0]} className={inputClass}>
          {organizationTypeOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Website</span>
        <input type="url" name="website" defaultValue={organization?.website ?? ""} className={inputClass} />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Notes</span>
        <textarea name="notes" rows={4} defaultValue={organization?.notes ?? ""} className={inputClass} />
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
