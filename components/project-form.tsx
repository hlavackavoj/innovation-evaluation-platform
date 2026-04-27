import {
  Organization,
  Project,
  ProjectPotentialLevel,
  ProjectPriority,
  ProjectStage,
  User
} from "@prisma/client";
import {
  businessReadinessOptions,
  projectPotentialLevelOptions,
  projectPriorityOptions,
  projectStageOptions,
  teamStrengthOptions
} from "@/lib/constants";
import { formatEnumLabel } from "@/lib/format";

type ProjectFormProps = {
  action: (formData: FormData) => Promise<void>;
  project?: Project;
  organizations: Organization[];
  users: User[];
  submitLabel: string;
};

function dateFieldValue(value?: Date | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().split("T")[0];
}

export function ProjectForm({ action, project, organizations, users, submitLabel }: ProjectFormProps) {
  return (
    <form action={action} className="grid gap-6 rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-card lg:grid-cols-2">
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-700">Project title</span>
        <input
          name="title"
          required
          defaultValue={project?.title ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        />
      </label>

      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea
          name="description"
          required
          rows={5}
          defaultValue={project?.description ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Field</span>
        <input
          name="field"
          defaultValue={project?.field ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">IP status</span>
        <input
          name="ipStatus"
          defaultValue={project?.ipStatus ?? ""}
          placeholder="Leave empty if unknown"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Stage</span>
        <select
          name="stage"
          defaultValue={project?.stage ?? ProjectStage.DISCOVERY}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        >
          {projectStageOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Priority</span>
        <select
          name="priority"
          defaultValue={project?.priority ?? ProjectPriority.MEDIUM}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        >
          {projectPriorityOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Potential level</span>
        <select
          name="potentialLevel"
          defaultValue={project?.potentialLevel ?? ProjectPotentialLevel.LOW}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        >
          {projectPotentialLevelOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Team strength</span>
        <select
          name="teamStrength"
          defaultValue={project?.teamStrength ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        >
          <option value="">Not set</option>
          {teamStrengthOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Business readiness</span>
        <select
          name="businessReadiness"
          defaultValue={project?.businessReadiness ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        >
          <option value="">Not set</option>
          {businessReadinessOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Organization</span>
        <select
          name="organizationId"
          defaultValue={project?.organizationId ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        >
          <option value="">Unassigned</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Owner</span>
        <select
          name="ownerUserId"
          defaultValue={project?.ownerUserId ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        >
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-700">Next step</span>
        <input
          name="nextStep"
          defaultValue={project?.nextStep ?? ""}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Next step due date</span>
        <input
          type="date"
          name="nextStepDueDate"
          defaultValue={dateFieldValue(project?.nextStepDueDate)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Last contact date</span>
        <input
          type="date"
          name="lastContactAt"
          defaultValue={dateFieldValue(project?.lastContactAt)}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-tealCore"
        />
      </label>

      <div className="flex items-center justify-between rounded-2xl bg-slateMist px-4 py-4 lg:col-span-2">
        <p className="text-sm text-slate-600">
          This MVP keeps the project form intentionally compact and stores the business logic in dedicated Prisma and recommendation modules.
        </p>
        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-tealCore"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
