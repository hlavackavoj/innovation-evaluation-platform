import fs from "fs";
import path from "path";
import type {
  VaultData,
  VaultNote,
  VaultLink,
  VaultCalendarCandidate,
  VaultTechDebtItem,
  VaultOpenQuestion,
  VaultNextStepSection,
  VaultTask,
} from "./types";

const VAULT_ROOT = path.join(process.cwd(), "docs/obsidian");

// ─── File reading ─────────────────────────────────────────────────────────────

function readAllMarkdownFiles(dir: string): Array<{ relativePath: string; content: string }> {
  const results: Array<{ relativePath: string; content: string }> = [];

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          results.push({
            relativePath: path.relative(VAULT_ROOT, fullPath),
            content: fs.readFileSync(fullPath, "utf-8"),
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(dir);
  return results;
}

// ─── Extractors ───────────────────────────────────────────────────────────────

function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : path.basename(filename, ".md");
}

function extractHeadings(content: string): string[] {
  return Array.from(content.matchAll(/^#{2,4}\s+(.+)$/gm)).map((m) => m[1].trim());
}

function extractWikilinks(content: string): string[] {
  return Array.from(
    new Set(
      Array.from(content.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)).map((m) =>
        m[1].trim()
      )
    )
  );
}

function extractTags(content: string): string[] {
  // Only match inline #tags, not heading markers
  const matches = Array.from(content.matchAll(/(?:^|\s)#([a-zA-ZÀ-ž][a-zA-ZÀ-ž0-9_-]+)/gm)).map(
    (m) => m[1]
  );
  return Array.from(new Set(matches)).filter((t) => t.length > 1);
}

function extractExcerpt(content: string): string {
  const cleaned = content
    .replace(/^---[\s\S]*?---\n/, "")
    .replace(/^#{1,6}\s+.+$/gm, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`[^`]+`/g, "")
    .replace(/[*_]{1,2}([^*_\n]+)[*_]{1,2}/g, "$1")
    .replace(/^\|.+\|$/gm, "")
    .replace(/\n{2,}/g, " ")
    .trim();

  if (!cleaned) return "";
  const text = cleaned.replace(/\n/g, " ").trim();
  return text.length > 160 ? text.slice(0, 157) + "…" : text;
}

function getFolder(relativePath: string): string {
  const sep = relativePath.includes("/") ? "/" : "\\";
  const parts = relativePath.split(sep);
  return parts.length > 1 ? parts[0] : "_root";
}

function folderDisplayName(folder: string): string {
  // "02_CRM" → "CRM", "12_System_Memory" → "System Memory", "_root" → "Root"
  if (folder === "_root") return "Root";
  return folder.replace(/^\d+_/, "").replace(/_/g, " ");
}

// ─── Note builder ─────────────────────────────────────────────────────────────

function buildNote(relativePath: string, content: string): VaultNote {
  const filename = path.basename(relativePath);
  return {
    id: relativePath.replace(/[\\/]/g, "_").replace(/\.md$/, ""),
    title: extractTitle(content, filename),
    path: relativePath.replace(/\\/g, "/"),
    folder: getFolder(relativePath),
    headings: extractHeadings(content),
    wikilinks: extractWikilinks(content),
    tags: extractTags(content),
    wordCount: content.split(/\s+/).filter(Boolean).length,
    excerpt: extractExcerpt(content),
    isEmpty: content.trim().length === 0,
  };
}

// ─── Structured parsers ────────────────────────────────────────────────────────

function parseNextStepSections(content: string, sourcePath: string): VaultNextStepSection[] {
  const sections: VaultNextStepSection[] = [];
  // Split on H2 boundaries
  const blocks = content.split(/^## /m).slice(1);

  for (const block of blocks) {
    const lines = block.split("\n");
    const title = lines[0].trim();
    if (!title) continue;

    const items: string[] = [];
    for (const line of lines.slice(1)) {
      // "1. **Bold title** — detail" or "1. plain text"
      const boldMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*(?:\s*[—-]\s*(.+))?/);
      if (boldMatch) {
        const text = boldMatch[1] + (boldMatch[2] ? ` — ${boldMatch[2]}` : "");
        items.push(text.trim());
        continue;
      }
      const plainMatch = line.match(/^\d+\.\s+(.+)/);
      if (plainMatch) items.push(plainMatch[1].trim());
    }

    if (items.length > 0) {
      sections.push({
        id: title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        title,
        items,
        source: sourcePath.replace(/\\/g, "/"),
      });
    }
  }
  return sections;
}

function parseImmediateActions(content: string): string[] {
  const match = content.match(/## Immediate next steps\n([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];
  return Array.from(match[1].matchAll(/^\d+\.\s+\*\*(.+?)\*\*/gm)).map((m) => m[1].trim());
}

function parseTechDebt(content: string): VaultTechDebtItem[] {
  const tableMatch = content.match(/\| Oblast \|[\s\S]*?(?=\n\n##|\n---|\n$)/);
  if (!tableMatch) return [];

  const rows = tableMatch[0].split("\n").filter((l) => l.startsWith("|") && !l.includes("---"));
  return rows
    .slice(1) // skip header row
    .map((row) => {
      const cells = row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      return { area: cells[0] ?? "", problem: cells[1] ?? "", severity: cells[2] ?? "" };
    })
    .filter((item) => item.area && item.problem);
}

function parseOpenQuestions(content: string): VaultOpenQuestion[] {
  const match = content.match(/## Open questions\n([\s\S]*?)(?=\n##|$)/);
  if (!match) return [];

  const items: VaultOpenQuestion[] = [];
  let current: { number: number; text: string; detail: string } | null = null;

  for (const line of match[1].split("\n")) {
    const numbered = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*(?:\s*[—-]\s*(.+))?/);
    if (numbered) {
      if (current) {
        items.push({ ...current, detail: current.detail.trim(), source: "Open Questions" });
      }
      current = {
        number: parseInt(numbered[1]),
        text: numbered[2].trim(),
        detail: numbered[3] ?? "",
      };
    } else if (current && line.trim() && !line.startsWith("#")) {
      current.detail += " " + line.trim();
    }
  }
  if (current) items.push({ ...current, detail: current.detail.trim(), source: "Open Questions" });

  return items;
}

function parseCalendarCandidates(
  content: string,
  sourcePath: string
): VaultCalendarCandidate[] {
  const candidates: VaultCalendarCandidate[] = [];
  const dateMatches = Array.from(
    content.matchAll(/^## (20\d{2}-\d{2}-\d{2})\s*[—-]\s*(.+)$/gm)
  );

  for (const match of dateMatches) {
    const [, date, title] = match;
    const sectionStart = match.index! + match[0].length;
    const nextH2 = content.indexOf("\n## ", sectionStart);
    const sectionText = content
      .slice(sectionStart, nextH2 > 0 ? nextH2 : undefined)
      .trim()
      .split("\n")
      .find((l) => l.trim() && !l.startsWith("#"))
      ?.trim() ?? "";

    candidates.push({
      date,
      title: title.trim(),
      source: path.basename(sourcePath, ".md"),
      context: sectionText.length > 120 ? sectionText.slice(0, 117) + "…" : sectionText,
    });
  }

  return candidates;
}

// ─── Main export ──────────────────────────────────────────────────────────────

let _cachedVault: VaultData | null = null;

export function parseVault(bust = false): VaultData {
  // Lightweight in-process cache (cleared per request in production via Next.js)
  if (_cachedVault && !bust) return _cachedVault;

  const files = readAllMarkdownFiles(VAULT_ROOT);

  const notes: VaultNote[] = [];
  const allLinks: VaultLink[] = [];
  const allTags = new Set<string>();
  let calendarCandidates: VaultCalendarCandidate[] = [];
  let nextSteps: VaultNextStepSection[] = [];
  let immediateActions: string[] = [];
  let techDebt: VaultTechDebtItem[] = [];
  let openQuestions: VaultOpenQuestion[] = [];

  for (const { relativePath, content } of files) {
    const note = buildNote(relativePath, content);
    notes.push(note);

    note.tags.forEach((t) => allTags.add(t));
    for (const target of note.wikilinks) {
      allLinks.push({ from: note.id, to: target });
    }

    const relNorm = relativePath.replace(/\\/g, "/");
    const basename = path.basename(relativePath);

    if (relNorm.includes("99_Notes/Next_Steps")) {
      nextSteps = parseNextStepSections(content, relativePath);
    }
    if (relNorm.includes("11_Implementation") && basename.startsWith("Open")) {
      immediateActions = parseImmediateActions(content);
      techDebt = parseTechDebt(content);
      openQuestions = parseOpenQuestions(content);
    }
    if (relNorm.includes("99_Notes/Progress_Log")) {
      calendarCandidates = parseCalendarCandidates(content, relativePath);
    }
  }

  const tasks: VaultTask[] = nextSteps.flatMap((section) =>
    section.items.map((item, i) => ({
      id: `${section.id}-${i}`,
      text: item,
      sourceNote: section.source,
      category: section.title,
      status: "open" as const,
      priority: "medium" as const,
      deadline: null,
    }))
  );

  const unmappedItems = notes.filter((n) => n.folder === "start_up_kufrik");

  const notesByFolder: Record<string, VaultNote[]> = {};
  for (const note of notes) {
    const display = folderDisplayName(note.folder);
    (notesByFolder[display] ??= []).push(note);
  }

  const result: VaultData = {
    notes,
    tasks,
    links: allLinks,
    tags: Array.from(allTags).sort(),
    calendarCandidates,
    unmappedItems,
    openQuestions,
    techDebt,
    nextSteps,
    immediateActions,
    notesByFolder,
    stats: {
      totalNotes: notes.filter((n) => !n.isEmpty).length,
      totalLinks: allLinks.length,
      totalTasks: tasks.length,
      totalTags: allTags.size,
      totalTechDebt: techDebt.length,
      totalOpenQuestions: openQuestions.length,
    },
  };

  _cachedVault = result;
  return result;
}
