import { processCommunicationAction } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";

export function EmailImportForm({ projectId }: { projectId: string }) {
  const processCommunication = processCommunicationAction.bind(null, projectId);

  return (
    <form action={processCommunication} className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Thread subject</span>
        <input
          name="subject"
          defaultValue="Imported communication thread"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Communication thread</span>
        <textarea
          name="content"
          required
          rows={14}
          placeholder="Paste the full email thread from Outlook/Gmail here (multiple emails at once)."
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </label>
      <div className="flex justify-end">
        <Button type="submit">Analyzovat</Button>
      </div>
    </form>
  );
}
