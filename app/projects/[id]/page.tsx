import Link from "next/link";
import { notFound } from "next/navigation";
import { Zap, CheckCircle2, XCircle, ClipboardList, Users, Building2, Calendar, User } from "lucide-react";
import { pipelineStages } from "@/lib/constants";
import { getProjectById } from "@/lib/data";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { FeedbackToast } from "@/components/feedback-toast";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { convertRecommendationToTaskAction, updateProjectStageAction } from "@/app/projects/actions";

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
  searchParams?: { toast?: string };
}) {
  const project = await getProjectById(params.id);

  if (!project) notFound();

  const updateStage = updateProjectStageAction.bind(null, project.id);
  const convertRecommendation = convertRecommendationToTaskAction.bind(null, project.id);
  const primaryContact = project.contacts[0]?.contact;
  const pipelineProgress = ((pipelineStages.indexOf(project.stage) + 1) / pipelineStages.length) * 100;
  const scoringProgress = potentialProgress[project.potentialLevel];
  const readinessScore = project.businessReadiness ? readinessProgress[project.businessReadiness] : 0;
  const suggestedRoles = [...new Set(project.recommendations.map((r) => r.suggestedRole))];

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

          <div className="grid gap-5 xl:grid-cols-[1fr,320px]">
            {/* Main column */}
            <div className="space-y-5">
              {/* Overview */}
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

              {/* Recommendations inbox */}
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

              {/* Scoring */}
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

              {/* Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity Log</CardTitle>
                  <CardDescription>Meetings, evaluations, and notes linked to this project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.activities.length > 0 ? (
                    project.activities.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-zinc-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-800">{formatEnumLabel(activity.type)}</p>
                          <time className="text-xs text-zinc-400">{formatDate(activity.activityDate)}</time>
                        </div>
                        <p className="mt-2 text-sm text-zinc-500">{activity.note}</p>
                        <p className="mt-2 text-xs text-zinc-400">
                          Logged by {activity.user?.name ?? "Unknown"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center">
                      <p className="text-sm text-zinc-400">No activities logged yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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
        </div>
      </Shell>
    </>
  );
}
