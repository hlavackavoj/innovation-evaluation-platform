import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  Zap,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Users,
  Building2,
  Calendar,
  User,
  FileText,
  Download,
  UploadCloud
} from "lucide-react";
import { pipelineStages } from "@/lib/constants";
import { getProjectById } from "@/lib/data";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { FeedbackToast } from "@/components/feedback-toast";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { ProjectDocumentUploadForm } from "@/components/project-document-upload-form";
import { ProjectCommunicationTree } from "@/components/ProjectCommunicationTree";
import { ProjectCanvasView } from "@/components/ProjectCanvasView";
import { EmailImportForm } from "@/components/EmailImportForm";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  addProjectDocumentAction,
  createProjectActivityAction,
  convertRecommendationToTaskAction,
  updateProjectEmailAutomationSettingsAction,
  updateProjectStageAction
} from "@/app/projects/actions";
import { activityTypeOptions } from "@/lib/constants";

const potentialProgress = { LOW: 34, MEDIUM: 68, HIGH: 100 } as const;
const readinessProgress = { WEAK: 30, EMERGING: 65, STRONG: 100 } as const;

const recommendationStatusIcon = {
  PENDING: Zap,
  COMPLETED: CheckCircle2,
  DISMISSED: XCircle
} as const;

const recommendationBorder = {
  PENDING: "border-l-indigo-500",
  COMPLETED: "border-l-emerald-500",
  DISMISSED: "border-l-zinc-300"
} as const;

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { toast?: string; tab?: string; importedMessages?: string; importedTasks?: string };
}) {
  const project = await getProjectById(params.id);

  if (!project) notFound();

  const activeTab =
    searchParams?.tab === "documents" ? "documents" : searchParams?.tab === "canvas" ? "canvas" : "overview";
  const updateStage = updateProjectStageAction.bind(null, project.id);
  const convertRecommendation = convertRecommendationToTaskAction.bind(null, project.id);
  const addProjectDocument = addProjectDocumentAction.bind(null, project.id);
  const createActivity = createProjectActivityAction.bind(null, project.id);
  const updateEmailAutomation = updateProjectEmailAutomationSettingsAction.bind(null, project.id);
  const primaryContact = project.contacts[0]?.contact;
  const pipelineProgress = ((pipelineStages.indexOf(project.stage) + 1) / pipelineStages.length) * 100;
  const scoringProgress = potentialProgress[project.potentialLevel];
  const readinessScore = project.businessReadiness ? readinessProgress[project.businessReadiness] : 0;
  const suggestedRoles = [...new Set(project.recommendations.map((r) => r.suggestedRole))];
  const importedMessages = Number(searchParams?.importedMessages ?? "0");
  const importedTasks = Number(searchParams?.importedTasks ?? "0");
  const showImportSummary = Number.isFinite(importedMessages) && Number.isFinite(importedTasks) && importedMessages > 0;
  const { getUser } = getKindeServerSession();
  const sessionUser = await getUser();
  const signedInUserName = [sessionUser?.given_name, sessionUser?.family_name].filter(Boolean).join(" ") || sessionUser?.email || "Signed-in user";

  return (
    <>
      <FeedbackToast toastKey={searchParams?.toast} />
      <Shell
        title={project.title}
        description="Project workspace — pipeline, stakeholders, recommendations, and tasks."
        actions={
          <Link href={`/projects/${project.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit project
          </Link>
        }
      >
        <div className="space-y-5">
          <PipelineStepper stage={project.stage} />

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${project.id}`}
              className={buttonVariants({
                variant: activeTab === "overview" ? "default" : "outline",
                size: "sm"
              })}
            >
              Overview
            </Link>
            <Link
              href={`/projects/${project.id}?tab=canvas`}
              className={buttonVariants({
                variant: activeTab === "canvas" ? "default" : "outline",
                size: "sm"
              })}
            >
              Canvas Map
            </Link>
            <Link
              href={`/projects/${project.id}?tab=documents`}
              className={buttonVariants({
                variant: activeTab === "documents" ? "default" : "outline",
                size: "sm"
              })}
            >
              Documents & Templates
            </Link>
          </div>

          {activeTab === "canvas" ? (
            <div className="relative">
              <ProjectCanvasView
                projectId={project.id}
                projectStage={project.stage}
                activities={project.activities}
                tasks={project.tasks}
              />
              <div className="pointer-events-auto absolute right-3 top-3 z-30 rounded-lg border border-zinc-700/60 bg-zinc-950/85 px-3 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{signedInUserName}</span>
                  <span className="text-zinc-500">|</span>
                  <LogoutLink className="text-indigo-300 transition hover:text-indigo-200">Logout</LogoutLink>
                </div>
              </div>
            </div>
          ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr,320px]">
            {/* Main column */}
            <div className="space-y-5">
              {activeTab === "overview" ? (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={project.stage} />
                        <StatusBadge value={project.potentialLevel} />
                        <StatusBadge value={project.priority} />
                      </div>
                      <CardTitle className="pt-1 text-base">{project.title}</CardTitle>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-zinc-50 p-3.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Field</p>
                          <p className="mt-1.5 text-sm font-medium text-zinc-800">{project.field ?? "Not set"}</p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Pipeline progress</p>
                          <p className="mt-1.5 text-sm font-medium text-zinc-800">{Math.round(pipelineProgress)}%</p>
                          <Progress value={pipelineProgress} className="mt-2" />
                        </div>
                        <div className="rounded-lg border border-zinc-100 p-3.5">
                          <div className="flex items-center gap-1.5">
                            <User size={11} className="text-zinc-400" />
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Owner</p>
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-zinc-800">{project.owner?.name ?? "Unassigned"}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">Last contact {formatDate(project.lastContactAt)}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-100 p-3.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-zinc-400" />
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Next step</p>
                          </div>
                          <p className="mt-1.5 text-sm text-zinc-700">{project.nextStep ?? "No next step defined."}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">Due {formatDate(project.nextStepDueDate)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">Recommendations</CardTitle>
                          <CardDescription>Rule-based next steps for this stage.</CardDescription>
                        </div>
                        {suggestedRoles.length > 0 && (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {suggestedRoles.map((role) => (
                              <StatusBadge key={role} value={role} />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {project.recommendations.length > 0 ? (
                        project.recommendations.map((item) => {
                          const status = (item.status ?? "PENDING") as keyof typeof recommendationStatusIcon;
                          const Icon = recommendationStatusIcon[status] ?? Zap;
                          const borderColor = recommendationBorder[status] ?? "border-l-zinc-300";

                          return (
                            <div
                              key={item.id}
                              className={`rounded-lg border border-zinc-200 border-l-4 bg-white p-4 transition-shadow hover:shadow-sm ${borderColor}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                                    <Icon size={12} className="text-indigo-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                                    <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
                                    <p className="mt-2 text-xs text-zinc-400">
                                      Role: <span className="font-medium">{item.suggestedRole}</span>
                                    </p>
                                    {item.primaryTemplate && (
                                      <a
                                        href={item.primaryTemplate.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
                                      >
                                        <Download size={12} />
                                        Download Template
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <form action={convertRecommendation} className="shrink-0">
                                  <input type="hidden" name="recommendationId" value={item.id} />
                                  <Button type="submit" size="sm" variant="outline">
                                    Convert
                                  </Button>
                                </form>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          </div>
                          <p className="mt-3 text-sm font-medium text-zinc-700">All caught up</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Advance the stage or update context to generate new recommendations.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Scoring</CardTitle>
                      <CardDescription>Venture readiness and support planning signals.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-500">Potential</span>
                          <StatusBadge value={project.potentialLevel} />
                        </div>
                        <Progress value={scoringProgress} />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-500">Business readiness</span>
                          <span className="text-xs text-zinc-500">{formatEnumLabel(project.businessReadiness)}</span>
                        </div>
                        <Progress value={readinessScore} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-zinc-100 p-3.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Team strength</p>
                          <p className="mt-1.5 text-sm text-zinc-700">{formatEnumLabel(project.teamStrength)}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-100 p-3.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">IP status</p>
                          <p className="mt-1.5 text-sm text-zinc-700">{project.ipStatus ?? "Not set"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Activity Log</CardTitle>
                      <CardDescription>Meetings, evaluations, and notes linked to this project.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <form action={createActivity} className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[160px,160px,1fr]">
                        <label>
                          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Type</span>
                          <select
                            name="type"
                            defaultValue={activityTypeOptions[0]}
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            {activityTypeOptions.map((option) => (
                              <option key={option} value={option}>
                                {formatEnumLabel(option)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Date</span>
                          <input
                            type="date"
                            name="activityDate"
                            required
                            defaultValue={new Date().toISOString().slice(0, 10)}
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Note</span>
                          <textarea
                            name="note"
                            required
                            rows={3}
                            placeholder="Capture what happened, what changed, and what comes next."
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </label>
                        <div className="sm:col-span-3 flex justify-end">
                          <Button type="submit">Log activity</Button>
                        </div>
                      </form>

                      <EmailImportForm projectId={project.id} />

                      {showImportSummary && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                          Imported <span className="font-semibold">{importedMessages}</span> message
                          {importedMessages === 1 ? "" : "s"} and created{" "}
                          <span className="font-semibold">{importedTasks}</span> task
                          {importedTasks === 1 ? "" : "s"}.
                        </div>
                      )}

                      <ProjectCommunicationTree activities={project.activities} tasks={project.tasks} />

                      {project.emailLinks.length > 0 && (
                        <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
                          <p className="text-sm font-semibold text-zinc-900">Imported email matches</p>
                          {project.emailLinks.slice(0, 8).map((link) => (
                            <div key={link.id} className="rounded-lg border border-zinc-100 p-2">
                              <p className="text-xs font-medium text-zinc-800">{link.emailMessage.subject || "(no subject)"}</p>
                              <p className="text-xs text-zinc-500">
                                {formatDate(link.emailMessage.sentAt)} · {link.reason} · confidence {Math.round(link.confidence * 100)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                          <FileText size={15} />
                        </div>
                        <div>
                          <CardTitle className="text-base">Stage Templates</CardTitle>
                          <CardDescription>
                            Recommended files for the {formatEnumLabel(project.stage)} stage.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.stageTemplates.length > 0 ? (
                        project.stageTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{template.name}</p>
                              <p className="mt-1 text-sm text-zinc-500">{template.description}</p>
                            </div>
                            <a
                              href={template.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              <Download size={14} className="mr-1.5" />
                              Download
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center">
                          <p className="text-sm font-medium text-zinc-700">No templates assigned yet</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Add a stage template in the admin area to guide teams with the right document pack.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <UploadCloud size={15} />
                        </div>
                        <div>
                          <CardTitle className="text-base">Upload Completed Document</CardTitle>
                          <CardDescription>
                            Upload PDF, DOCX, and XLSX documents directly to project cloud storage.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                        Files are uploaded to the secure <span className="font-medium text-zinc-700">project-documents</span>{" "}
                        bucket, and only signed download URLs are exposed to authorized users.
                      </div>
                      <ProjectDocumentUploadForm action={addProjectDocument} templates={project.stageTemplates} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Uploaded Documents</CardTitle>
                      <CardDescription>Completed files linked back to the project record.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.documents.length > 0 ? (
                        project.documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{document.name}</p>
                              <p className="mt-1 text-xs text-zinc-400">
                                Added {formatDate(document.createdAt)}
                                {document.template ? ` · Based on ${document.template.name}` : ""}
                              </p>
                            </div>
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              Open file
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center">
                          <p className="text-sm text-zinc-400">No project documents saved yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Stage control */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Advance Stage</CardTitle>
                  <CardDescription>Move the project through the pipeline.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {pipelineStages.map((stage) => (
                    <form key={stage} action={updateStage}>
                      <input type="hidden" name="stage" value={stage} />
                      <button
                        type="submit"
                        className={buttonVariants({
                          variant: stage === project.stage ? "default" : "outline",
                          size: "sm"
                        })}
                      >
                        {formatEnumLabel(stage)}
                      </button>
                    </form>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Email Automation</CardTitle>
                  <CardDescription>Analyze synced communication and attach it to this timeline.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={updateEmailAutomation} className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={project.emailAutomationSetting?.enabled ?? false}
                      />
                      Analyze my communication for this project
                    </label>
                    <label className="block text-xs text-zinc-500">
                      Schedule
                      <select
                        name="schedule"
                        defaultValue={project.emailAutomationSetting?.schedule ?? ""}
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm text-zinc-700"
                      >
                        <option value="">No schedule</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </label>
                    <label className="block text-xs text-zinc-500">
                      Keyword aliases (comma-separated)
                      <input
                        name="keywordAliases"
                        defaultValue={(project.emailAutomationSetting?.keywordAliases ?? []).join(", ")}
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm text-zinc-700"
                        placeholder="project alias, codename"
                      />
                    </label>
                    <label className="block text-xs text-zinc-500">
                      Organization domains (comma-separated)
                      <input
                        name="domains"
                        defaultValue={(project.emailAutomationSetting?.domains ?? []).map((item) => item.domain).join(", ")}
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm text-zinc-700"
                        placeholder="example.edu, partner.com"
                      />
                    </label>
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">Linked contacts for exact matching</p>
                      <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-zinc-100 p-2">
                        {project.contacts.map(({ contact }) => {
                          const checked = project.emailAutomationSetting?.contacts.some(
                            (item) => item.contactId === contact.id
                          );
                          return (
                            <label key={contact.id} className="flex items-center gap-2 text-xs text-zinc-700">
                              <input type="checkbox" name="contactIds" value={contact.id} defaultChecked={checked} />
                              {contact.name} {contact.email ? `(${contact.email})` : ""}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <Button type="submit" size="sm">
                      Save automation
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Tasks */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-1.5">
                    <ClipboardList size={14} className="text-zinc-400" />
                    <CardTitle className="text-base">Tasks</CardTitle>
                  </div>
                  <CardDescription>Operational follow-up items for this project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {project.tasks.length > 0 ? (
                    project.tasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-zinc-100 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-800">{task.title}</p>
                          <div className="flex shrink-0 gap-1.5">
                            <StatusBadge value={task.priority} />
                            <StatusBadge value={task.status} />
                          </div>
                        </div>
                        {task.description && (
                          <p className="mt-1.5 text-xs text-zinc-400">{task.description}</p>
                        )}
                        <p className="mt-2 text-xs text-zinc-400">
                          Due {formatDate(task.dueDate)} · {task.assignedTo?.name ?? "Unassigned"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-6 text-center">
                      <p className="text-xs text-zinc-400">No tasks yet. Convert a recommendation to create one.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contacts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-zinc-400" />
                    <CardTitle className="text-base">Contacts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {primaryContact ? (
                    <div className="rounded-lg bg-indigo-50 p-3.5">
                      <p className="text-xs font-medium text-indigo-700">Primary contact</p>
                      <p className="mt-1.5 text-sm font-medium text-zinc-900">{primaryContact.name}</p>
                      <p className="text-xs text-zinc-500">{primaryContact.role}</p>
                      <div className="mt-2 space-y-0.5">
                        <p className="text-xs text-zinc-600">{primaryContact.email ?? "No email"}</p>
                        <p className="text-xs text-zinc-600">{primaryContact.phone ?? "No phone"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-6 text-center">
                      <p className="text-xs text-zinc-400">No linked contacts.</p>
                    </div>
                  )}
                  {project.contacts.slice(1).map(({ contact }) => (
                    <div key={contact.id} className="rounded-lg border border-zinc-100 p-3.5">
                      <p className="text-sm font-medium text-zinc-800">{contact.name}</p>
                      <p className="text-xs text-zinc-400">
                        {contact.role} · {contact.organization?.name ?? "—"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Organization */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-zinc-400" />
                    <CardTitle className="text-base">Organization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-zinc-100 p-3.5">
                    <p className="text-sm font-medium text-zinc-800">
                      {project.organization?.name ?? "No organization linked"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">{formatEnumLabel(project.organization?.type)}</p>
                    {project.organization?.website && (
                      <p className="mt-2 text-xs text-indigo-600">{project.organization.website}</p>
                    )}
                    {project.organization?.notes && (
                      <p className="mt-2 text-xs text-zinc-500">{project.organization.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      </Shell>
    </>
  );
}
