import { GoogleGenerativeAI } from "@google/generative-ai";

export type PatentEmailTask = {
  title: string;
  assignee: string;
  deadlineDays: number;
};

export type PatentEmailAnalysis = {
  phase: string;
  summary: string;
  tasks: PatentEmailTask[];
  isResponseTo: string | null;
};

const PROMPT = `You analyze patent-related email communication for a university innovation CRM.
Return STRICT JSON only, no markdown, no extra text.
JSON schema:
{
  "phase": "string",
  "summary": "string",
  "tasks": [{"title":"string","assignee":"string","deadlineDays":0}],
  "isResponseTo": "string or null"
}
Rules:
- phase should be a short label for the current project phase inferred from the email.
- summary should be concise (1-3 sentences) and factual.
- tasks should include actionable next steps only.
- deadlineDays should be an integer number of days from now.
- isResponseTo should be the parent email message id if this email is a reply, otherwise null.`;

function cleanJson(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.startsWith("```")) {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }
  }

  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAnalysis(value: unknown): PatentEmailAnalysis {
  if (!isRecord(value)) {
    throw new Error("AI response is not an object.");
  }

  const phase = typeof value.phase === "string" ? value.phase.trim() : "";
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  const isResponseToRaw = value.isResponseTo;

  if (!phase) {
    throw new Error("AI response is missing phase.");
  }

  if (!summary) {
    throw new Error("AI response is missing summary.");
  }

  const isResponseTo = typeof isResponseToRaw === "string" ? isResponseToRaw.trim() || null : null;
  const taskItems = Array.isArray(value.tasks) ? value.tasks : [];

  const tasks: PatentEmailTask[] = taskItems
    .filter((task): task is Record<string, unknown> => isRecord(task))
    .map((task) => {
      const title = typeof task.title === "string" ? task.title.trim() : "";
      const assignee = typeof task.assignee === "string" ? task.assignee.trim() : "Unassigned";
      const rawDeadline = task.deadlineDays;
      const deadlineDays =
        typeof rawDeadline === "number"
          ? Math.round(rawDeadline)
          : typeof rawDeadline === "string"
            ? Math.round(Number(rawDeadline))
            : NaN;

      if (!title || Number.isNaN(deadlineDays) || deadlineDays < 0) {
        return null;
      }

      return {
        title,
        assignee: assignee || "Unassigned",
        deadlineDays
      };
    })
    .filter((task): task is PatentEmailTask => task !== null);

  return {
    phase,
    summary,
    tasks,
    isResponseTo
  };
}

export async function analyzePatentEmail(content: string, subject: string): Promise<PatentEmailAnalysis> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is missing.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${PROMPT}\n\nSubject: ${subject}\n\nEmail content:\n${content}`
          }
        ]
      }
    ]
  });

  const text = result.response.text();
  const parsed = JSON.parse(cleanJson(text)) as unknown;

  return parseAnalysis(parsed);
}
