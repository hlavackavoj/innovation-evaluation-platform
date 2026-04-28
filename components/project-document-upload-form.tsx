"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type UploadTemplateOption = {
  id: string;
  name: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload document"
          )}
        </Button>
      </div>
      {pending && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">Uploading file to secure storage...</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-600" />
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectDocumentUploadForm({
  action,
  templates
}: {
  action: (formData: FormData) => void | Promise<void>;
  templates: UploadTemplateOption[];
}) {
  return (
    <form action={action} className="grid gap-3">
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Document name (optional)</span>
        <input
          name="name"
          placeholder="e.g. Validation interview guide"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">File</span>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-xs text-zinc-400">Accepted: PDF, DOCX, XLSX, PPTX (max 20 MB)</p>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Based on template</span>
        <select
          name="templateId"
          defaultValue=""
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">No template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton />
    </form>
  );
}
