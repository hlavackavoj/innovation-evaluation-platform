import Link from "next/link";
import { notFound } from "next/navigation";
import { pipelineStages } from "@/lib/constants";
import { getProjectById } from "@/lib/data";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { getProjectRecommendations } from "@/lib/recommendations";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { updateProjectStageAction } from "@/app/projects/actions";

const potentialProgress = {
  LOW: 34,
  MEDIUM: 68,
  HIGH: 100
} as const;

const readinessProgress = {
  WEAK: 30,
  EMERGING: 65,
  STRONG: 100
} as const;

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await getProjectById(params.id);

  if (!project) {
    notFound();
  }

  const recommendations = getProjectRecommendations(project);
  const updateStage = updateProjectStageAction.bind(null, project.id);
  const primaryContact = project.contacts[0]?.contact;
  const pipelineProgress = ((pipelineStages.indexOf(project.stage) + 1) / pipelineStages.length) * 100;
  const scoringProgress = potentialProgress[project.potentialLevel];
  const readinessScore = project.businessReadiness ? readinessProgress[project.businessReadiness] : 0;

  return (
    <Shell
      title={project.title}
      description="Phase 1 CRM detail view with pipeline context, linked stakeholders, and operational follow-up."
      actions={<Link href={`/projects/${project.id}/edit`} className={buttonVariants({})}>Edit project</Link>}
    >
      <div className="space-y-6">
        <PipelineStepper stage={project.stage} />

        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge value={project.stage} />
                  <StatusBadge value={project.potentialLevel} />
                  <StatusBadge value={project.priority} />
                </div>
                <CardTitle className="pt-2">Project Overview</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slateMist p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Field</p>
                  <p className="mt-2 font-semibold text-ink">{project.field ?? "Not set"}</p>
                </div>
                <div className="rounded-2xl bg-slateMist p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pipeline progress</p>
                  <p className="mt-2 font-semibold text-ink">{Math.round(pipelineProgress)}%</p>
                  <Progress value={pipelineProgress} className="mt-3" />
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Owner</p>
                  <p className="mt-2 font-semibold text-ink">{project.owner?.name ?? "Unassigned"}</p>
                  <p className="mt-1 text-sm text-slate-500">Last contact {formatDate(project.lastContactAt)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Next step</p>
                  <p className="mt-2 text-sm text-slate-700">{project.nextStep ?? "No next step defined yet."}</p>
                  <p className="mt-3 text-sm text-slate-500">Due {formatDate(project.nextStepDueDate)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scoring Status</CardTitle>
                <CardDescription>Quick portfolio signals for venture readiness and institutional support planning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">Potential level</span>
                    <StatusBadge value={project.potentialLevel} />
                  </div>
                  <Progress value={scoringProgress} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">Business readiness</span>
                    <span className="text-sm text-slate-600">{formatEnumLabel(project.businessReadiness)}</span>
                  </div>
                  <Progress value={readinessScore} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Team strength</p>
                    <p className="mt-2 text-sm text-slate-700">{formatEnumLabel(project.teamStrength)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">IP status</p>
                    <p className="mt-2 text-sm text-slate-700">{project.ipStatus ?? "Missing"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Recommended Steps</CardTitle>
                <CardDescription>Placeholder for the support guidance layer used by innovation managers and evaluators.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.length > 0 ? (
                  recommendations.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-ink">{item.title}</p>
                        <StatusBadge value={item.priority.toUpperCase()} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Suggested roles: {item.suggestedRoles.join(", ")}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                    No recommendations yet. This placeholder is ready for rule-based guidance in the next iteration.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Update Stage</CardTitle>
                <CardDescription>Move the project through the pipeline as new evidence or support milestones are confirmed.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
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
                <CardTitle>Contact Details</CardTitle>
                <CardDescription>Primary project people and supporting stakeholder context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {primaryContact ? (
                  <div className="rounded-2xl bg-slateMist p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Primary contact</p>
                    <p className="mt-2 font-semibold text-ink">{primaryContact.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{primaryContact.role}</p>
                    <p className="mt-3 text-sm text-slate-700">{primaryContact.email ?? "No email"}</p>
                    <p className="mt-1 text-sm text-slate-700">{primaryContact.phone ?? "No phone"}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No linked contacts yet.</div>
                )}
                <div className="space-y-3">
                  {project.contacts.slice(1).map(({ contact }) => (
                    <div key={contact.id} className="rounded-2xl border border-slate-200 p-4">
                      <p className="font-semibold text-ink">{contact.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {contact.role} · {contact.organization?.name ?? "No organization"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Info</CardTitle>
                <CardDescription>Institutional context for the project owner and support network.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-ink">{project.organization?.name ?? "No organization linked"}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatEnumLabel(project.organization?.type)}</p>
                  <p className="mt-3 text-sm text-slate-700">{project.organization?.website ?? "No website listed"}</p>
                  {project.organization?.notes ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{project.organization.notes}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Linked Tasks</CardTitle>
                <CardDescription>Operational follow-up owned by the project team and support staff.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.tasks.length > 0 ? (
                  project.tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-ink">{task.title}</p>
                        <div className="flex gap-2">
                          <StatusBadge value={task.priority} />
                          <StatusBadge value={task.status} />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">{task.description ?? "No task description"}</p>
                      <p className="mt-3 text-sm text-slate-500">
                        Due {formatDate(task.dueDate)} · Assigned to {task.assignedTo?.name ?? "Unassigned"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No linked tasks yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
