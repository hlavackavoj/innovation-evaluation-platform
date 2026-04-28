import { formatDate } from "@/lib/format";

type ActivityNode = {
  id: string;
  note: string;
  activityDate: Date;
  emailMessageId: string | null;
  emailParentId: string | null;
  aiAnalysis: unknown;
  user: { name: string } | null;
};

type ActivityTask = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  sourceActivityId: string | null;
};

type ParsedAnalysis = {
  summary: string;
};

function parseAnalysis(value: unknown): ParsedAnalysis | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const summary = "summary" in value && typeof value.summary === "string" ? value.summary.trim() : "";

  if (!summary) {
    return null;
  }

  return { summary };
}

type TreeNode = {
  activity: ActivityNode;
  depth: number;
};

function buildTree(activities: ActivityNode[]): TreeNode[] {
  const sorted = [...activities].sort((a, b) => a.activityDate.getTime() - b.activityDate.getTime());
  const byMessageId = new Map<string, ActivityNode>();

  sorted.forEach((activity) => {
    if (activity.emailMessageId) {
      byMessageId.set(activity.emailMessageId, activity);
    }
  });

  const childrenByParentMessageId = new Map<string, ActivityNode[]>();
  const roots: ActivityNode[] = [];

  sorted.forEach((activity) => {
    const parentMessageId = activity.emailParentId;
    const parent = parentMessageId ? byMessageId.get(parentMessageId) : null;

    if (!parent) {
      roots.push(activity);
      return;
    }

    const list = childrenByParentMessageId.get(parent.emailMessageId ?? "") ?? [];
    list.push(activity);
    childrenByParentMessageId.set(parent.emailMessageId ?? "", list);
  });

  const flattened: TreeNode[] = [];

  function visit(node: ActivityNode, depth: number) {
    flattened.push({ activity: node, depth });
    const children = childrenByParentMessageId.get(node.emailMessageId ?? "") ?? [];

    children
      .sort((a, b) => a.activityDate.getTime() - b.activityDate.getTime())
      .forEach((child) => visit(child, depth + 1));
  }

  roots.forEach((root) => visit(root, 0));

  return flattened;
}

export function ProjectCommunicationTree({ activities, tasks }: { activities: ActivityNode[]; tasks: ActivityTask[] }) {
  const flatTree = buildTree(activities);
  const tasksByActivityId = tasks.reduce<Map<string, ActivityTask[]>>((map, task) => {
    if (!task.sourceActivityId) return map;
    const items = map.get(task.sourceActivityId) ?? [];
    items.push(task);
    map.set(task.sourceActivityId, items);
    return map;
  }, new Map());

  if (flatTree.length === 0) {
    return <p className="text-sm text-zinc-400">No communication records yet.</p>;
  }

  return (
    <div className="space-y-3">
      {flatTree.map(({ activity, depth }) => {
        const analysis = parseAnalysis(activity.aiAnalysis);
        const linkedTasks = tasksByActivityId.get(activity.id) ?? [];

        return (
          <div
            key={activity.id}
            className="rounded-lg border border-zinc-100 bg-white p-4"
            style={{ marginLeft: `${Math.min(depth, 6) * 20}px` }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-800">Email message</p>
              <time className="text-xs text-zinc-400">{formatDate(activity.activityDate)}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-500">{activity.note}</p>
            <p className="mt-2 text-xs text-zinc-400">Logged by {activity.user?.name ?? "Unknown"}</p>
            {analysis && (
              <div className="mt-3 rounded-md border border-indigo-100 bg-indigo-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">AI summary</p>
                <p className="mt-1 text-sm text-indigo-900">{analysis.summary}</p>
              </div>
            )}
            {linkedTasks.length > 0 && (
              <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Linked tasks</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                  {linkedTasks.map((task) => (
                    <li key={task.id}>
                      {task.title} ({task.status}){task.dueDate ? ` · Due ${formatDate(task.dueDate)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
