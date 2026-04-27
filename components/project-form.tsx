import {
  Organization,
  PipelineStage,
  Project,
  ProjectPotentialLevel,
  ProjectPriority,
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
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-400";

const labelClass = "block text-xs font-medium text-zinc-500 mb-1.5";

export function ProjectForm({ action, project, organizations, users, submitLabel }: ProjectFormProps) {
  return (
    <form action={action} className="grid gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:grid-cols-2">
      <label className="lg:col-span-2">
        <span className={labelClass}>Project title</span>
        <input
          name="title"
          required
          defaultValue={project?.title ?? ""}
          placeholder="e.g. BioSense Diagnostics"
          className={inputClass}
        />
      </label>

      <label className="lg:col-span-2">
        <span className={labelClass}>Description</span>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={project?.description ?? ""}
          placeholder="Brief overview of the project, problem space, and team..."
          className={inputClass}
        />
      </label>

      <label>
        <span className={labelClass}>Field</span>
        <input
          name="field"
          defaultValue={project?.field ?? ""}
          placeholder="e.g. MedTech, AgriTech, EdTech"
          className={inputClass}
        />
      </label>

      <label>
        <span className={labelClass}>IP status</span>
        <input
          name="ipStatus"
          defaultValue={project?.ipStatus ?? ""}
          placeholder="Leave empty if unknown"
          className={inputClass}
        />
      </label>

      <label>
        <span className={labelClass}>Stage</span>
        <select
          name="stage"
          defaultValue={project?.stage ?? PipelineStage.DISCOVERY}
          className={inputClass}
        >
          {projectStageOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Priority</span>
        <select
          name="priority"
          defaultValue={project?.priority ?? ProjectPriority.MEDIUM}
          className={inputClass}
        >
          {projectPriorityOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Potential level</span>
        <select
          name="potentialLevel"
          defaultValue={project?.potentialLevel ?? ProjectPotentialLevel.LOW}
          className={inputClass}
        >
          {projectPotentialLevelOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Team strength</span>
        <select name="teamStrength" defaultValue={project?.teamStrength ?? ""} className={inputClass}>
          <option value="">Not set</option>
          {teamStrengthOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Business readiness</span>
        <select
          name="businessReadiness"
          defaultValue={project?.businessReadiness ?? ""}
          className={inputClass}
        >
          <option value="">Not set</option>
          {businessReadinessOptions.map((option) => (
            <option key={option} value={option}>
              {formatEnumLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Organization</span>
        <select
          name="organizationId"
          defaultValue={project?.organizationId ?? ""}
          className={inputClass}
        >
          <option value="">Unassigned</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Owner</span>
        <select name="ownerUserId" defaultValue={project?.ownerUserId ?? ""} className={inputClass}>
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      <label className="lg:col-span-2">
        <span className={labelClass}>Next step</span>
        <input
          name="nextStep"
          defaultValue={project?.nextStep ?? ""}
          placeholder="Describe the immediate next action for this project"
          className={inputClass}
        />
      </label>

      <label>
        <span className={labelClass}>Next step due date</span>
        <input
          type="date"
          name="nextStepDueDate"
          defaultValue={dateFieldValue(project?.nextStepDueDate)}
          className={inputClass}
        />
      </label>

      <label>
        <span className={labelClass}>Last contact date</span>
        <input
          type="date"
          name="lastContactAt"
          defaultValue={dateFieldValue(project?.lastContactAt)}
          className={inputClass}
        />
      </label>

      <div className="flex items-center justify-end border-t border-zinc-100 pt-4 lg:col-span-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
