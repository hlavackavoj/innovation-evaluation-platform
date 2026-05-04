import { redirect } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  BookOpen,
  Link2,
  ListChecks,
  AlertCircle,
  Calendar,
  Folder,
  Inbox,
  ChevronRight,
  ExternalLink,
  Zap,
  HelpCircle,
  Wrench,
  FileText,
  Hash,
} from "lucide-react";
import { parseVault } from "@/lib/obsidian/parser";
import type { VaultNextStepSection, VaultTechDebtItem, VaultOpenQuestion, VaultCalendarCandidate, VaultNote } from "@/lib/obsidian/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ─── Micro-components ─────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <span className={`text-lg font-semibold tabular-nums ${accent ?? "text-zinc-100"}`}>
        {value}
      </span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} className="text-zinc-500 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
          {count}
        </span>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 ${className}`}>
      {children}
    </div>
  );
}

function WikilinkChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300">
      [[{name}]]
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const low = severity.toLowerCase().includes("nízká") || severity.toLowerCase().includes("low");
  const high = severity.toLowerCase().includes("vysoká") || severity.toLowerCase().includes("high");
  const cls = high
    ? "bg-rose-950/60 text-rose-400 border-rose-900/60"
    : low
    ? "bg-zinc-800 text-zinc-400 border-zinc-700"
    : "bg-amber-950/50 text-amber-400 border-amber-900/50";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {severity}
    </span>
  );
}

// ─── Section components ────────────────────────────────────────────────────────

function NextStepsSection({ sections }: { sections: VaultNextStepSection[] }) {
  if (sections.length === 0) return null;
  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader icon={ListChecks} label="Next Steps" count={sections.reduce((s, sec) => s + sec.items.length, 0)} />
        <p className="text-[11px] text-zinc-600 font-mono">docs/obsidian/99_Notes/Next_Steps.md</p>
      </div>
      <div className="divide-y divide-zinc-800/60">
        {sections.map((section) => (
          <div key={section.id} className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold text-indigo-400">{section.title}</p>
            <ol className="space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-800 text-[9px] font-bold text-zinc-500">
                    {i + 1}
                  </span>
                  <span className="text-xs text-zinc-300 leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OpenQuestionsSection({ questions }: { questions: VaultOpenQuestion[] }) {
  if (questions.length === 0) return null;
  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader icon={HelpCircle} label="Open Questions" count={questions.length} />
        <p className="text-[11px] text-zinc-600 font-mono">11_Implementation/Open Questions & Next Steps.md</p>
      </div>
      <div className="divide-y divide-zinc-800/60">
        {questions.map((q) => (
          <div key={q.number} className="px-5 py-3.5">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-semibold text-zinc-500">
                {q.number}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200">{q.text}</p>
                {q.detail && (
                  <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed">{q.detail}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TechDebtSection({ items }: { items: VaultTechDebtItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader icon={Wrench} label="Technical Debt" count={items.length} />
        <p className="text-[11px] text-zinc-600 font-mono">11_Implementation/Open Questions & Next Steps.md</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-5 py-2.5 text-left font-medium text-zinc-500">Oblast</th>
              <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Problém</th>
              <th className="px-5 py-2.5 text-right font-medium text-zinc-500">Závažnost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {items.map((item, i) => (
              <tr key={i} className="group hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-3 font-mono text-[11px] text-indigo-300 align-top whitespace-nowrap">
                  {item.area}
                </td>
                <td className="px-3 py-3 text-zinc-300 leading-relaxed">{item.problem}</td>
                <td className="px-5 py-3 text-right align-top">
                  <SeverityBadge severity={item.severity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CalendarCandidatesSection({ candidates }: { candidates: VaultCalendarCandidate[] }) {
  if (candidates.length === 0) return null;
  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader icon={Calendar} label="Timeline / Calendar" count={candidates.length} />
      </div>
      <div className="divide-y divide-zinc-800/60">
        {candidates.map((c, i) => (
          <div key={i} className="px-5 py-3.5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-center">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-300">
                  {c.date}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-200">{c.title}</p>
                {c.context && (
                  <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                    {c.context}
                  </p>
                )}
                <p className="mt-1 text-[10px] font-mono text-zinc-600">{c.source}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NotesBrowserSection({ notesByFolder }: { notesByFolder: Record<string, VaultNote[]> }) {
  const ordered = Object.entries(notesByFolder)
    .filter(([folder]) => folder !== "Start up kufrik" && folder !== "Root")
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader
          icon={Folder}
          label="Vault — přehled"
          count={ordered.reduce((s, [, notes]) => s + notes.length, 0)}
        />
      </div>
      <div className="divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto">
        {ordered.map(([folder, notes]) => (
          <div key={folder} className="px-5 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {folder}
            </p>
            <div className="space-y-1.5">
              {notes.map((note) => (
                <div key={note.id} className="group flex items-start gap-2">
                  <FileText size={11} className="mt-0.5 shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
                      {note.title}
                    </p>
                    {note.excerpt && (
                      <p className="text-[10px] text-zinc-600 truncate leading-tight mt-0.5">
                        {note.excerpt}
                      </p>
                    )}
                    {note.wikilinks.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {note.wikilinks.slice(0, 3).map((wl) => (
                          <WikilinkChip key={wl} name={wl} />
                        ))}
                        {note.wikilinks.length > 3 && (
                          <span className="text-[10px] text-zinc-600">+{note.wikilinks.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InboxSection({ items }: { items: VaultNote[] }) {
  return (
    <Card>
      <div className="border-b border-zinc-800 px-5 py-4">
        <SectionHeader icon={Inbox} label="Inbox / Nezpracované" count={items.length} />
        <p className="text-[11px] text-zinc-600 font-mono">docs/obsidian/start_up_kufrik/</p>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-zinc-600">Inbox je prázdný.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {items.map((note) => (
            <div key={note.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-900/50 bg-amber-950/40">
                <Inbox size={12} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-300">
                  {note.isEmpty ? (
                    <span className="italic text-zinc-600">{note.title} — prázdná poznámka</span>
                  ) : (
                    note.title
                  )}
                </p>
                <p className="text-[10px] font-mono text-zinc-600">{note.path}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TagsSection({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <Card className="px-5 py-4">
      <SectionHeader icon={Hash} label="Tagy" count={tags.length} />
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400"
          >
            #{tag}
          </span>
        ))}
      </div>
    </Card>
  );
}

function ImmediateActionsBar({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="border-b border-indigo-900/40 bg-indigo-950/30 px-6 py-3">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <Zap size={12} className="text-indigo-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
            Immediate
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200"
            >
              <span className="text-zinc-600">{i + 1}.</span>
              {action}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KnowledgePage() {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login?callbackUrl=/knowledge");
  }

  const data = parseVault();

  return (
    // Dark page — extend beyond the layout's px-6 py-8 padding
    <div className="-mx-6 -my-8 min-h-[calc(100vh-3.5rem)] bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <BookOpen size={13} className="text-indigo-400" />
              <span className="font-mono text-[11px] text-zinc-600">docs/obsidian/</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
              Znalostní mapa projektu
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Obsidian vault · {data.stats.totalNotes} poznámek · {data.stats.totalLinks} odkazů · mapováno {new Date().toLocaleDateString("cs-CZ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <StatPill label="Poznámky" value={data.stats.totalNotes} accent="text-zinc-100" />
            <StatPill label="Linky" value={data.stats.totalLinks} accent="text-indigo-400" />
            <StatPill label="Akce" value={data.stats.totalTasks} accent="text-emerald-400" />
            <StatPill label="Tech Debt" value={data.stats.totalTechDebt} accent="text-amber-400" />
            <StatPill label="Otázky" value={data.stats.totalOpenQuestions} accent="text-rose-400" />
          </div>
        </div>
      </div>

      {/* Immediate actions banner */}
      <ImmediateActionsBar actions={data.immediateActions} />

      {/* Main grid */}
      <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1fr,360px]">
        {/* Left — structured content */}
        <div className="space-y-5">
          <NextStepsSection sections={data.nextSteps} />
          <OpenQuestionsSection questions={data.openQuestions} />
          <TechDebtSection items={data.techDebt} />
        </div>

        {/* Right — reference panels */}
        <div className="space-y-5">
          <CalendarCandidatesSection candidates={data.calendarCandidates} />
          <TagsSection tags={data.tags} />
          <NotesBrowserSection notesByFolder={data.notesByFolder} />
          <InboxSection items={data.unmappedItems} />
        </div>
      </div>

      {/* Related items footer */}
      <div className="border-t border-zinc-800 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[11px] text-zinc-600 uppercase tracking-wider font-semibold">Related</span>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronRight size={11} /> Projekty
          </Link>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronRight size={11} /> Milníky & úkoly
          </Link>
          <Link
            href="/email-analyzer"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronRight size={11} /> Email Analyzer
          </Link>
          <span className="ml-auto font-mono text-[10px] text-zinc-700">
            vault · {data.notes.length} files
          </span>
        </div>
      </div>
    </div>
  );
}
