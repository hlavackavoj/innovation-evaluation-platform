import { FilePlus2, Download } from "lucide-react";
import { createTemplateAction } from "@/app/projects/actions";
import { Shell } from "@/components/shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTemplates } from "@/lib/data";
import { projectStageOptions } from "@/lib/constants";
import { formatEnumLabel, formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-400";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <Shell
      title="Document Templates"
      description="Assign stage-specific files so recommendations can point teams to the right paperwork."
    >
      <div className="grid gap-5 lg:grid-cols-[360px,1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <FilePlus2 size={15} />
              </div>
              <div>
                <CardTitle className="text-base">Add Template</CardTitle>
                <CardDescription>Simple admin form for stage playbooks and file packs.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form action={createTemplateAction} className="grid gap-3">
              <label>
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">Name</span>
                <input name="name" required placeholder="e.g. NDA Template" className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">Description</span>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="What the team should use this document for at this stage."
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">Template file</span>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-zinc-400">Upload directly to the secure Supabase bucket.</p>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">Target stage</span>
                <select name="targetStage" defaultValue={projectStageOptions[0]} className={inputClass}>
                  {projectStageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {formatEnumLabel(stage)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end">
                <Button type="submit">Save template</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template Library</CardTitle>
            <CardDescription>Every stage can have one or more starter documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length > 0 ? (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">{template.name}</p>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                        {formatEnumLabel(template.targetStage)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{template.description}</p>
                    <p className="mt-2 text-xs text-zinc-400">Added {formatDate(template.createdAt)}</p>
                  </div>
                  <a
                    href={template.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Download size={14} className="mr-1.5" />
                    Open file
                  </a>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center">
                <p className="text-sm font-medium text-zinc-700">No templates yet</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Create your first template to start augmenting stage recommendations.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
