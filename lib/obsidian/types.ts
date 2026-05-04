export interface VaultNote {
  id: string;
  title: string;
  path: string;
  folder: string;
  headings: string[];
  wikilinks: string[];
  tags: string[];
  wordCount: number;
  excerpt: string;
  isEmpty: boolean;
}

export interface VaultTask {
  id: string;
  text: string;
  sourceNote: string;
  category: string;
  status: "open" | "done";
  priority: "urgent" | "high" | "medium" | "low";
  deadline: string | null;
}

export interface VaultLink {
  from: string;
  to: string;
}

export interface VaultCalendarCandidate {
  date: string;
  title: string;
  source: string;
  context: string;
}

export interface VaultTechDebtItem {
  area: string;
  problem: string;
  severity: string;
}

export interface VaultOpenQuestion {
  number: number;
  text: string;
  detail: string;
  source: string;
}

export interface VaultNextStepSection {
  id: string;
  title: string;
  items: string[];
  source: string;
}

export interface VaultData {
  notes: VaultNote[];
  tasks: VaultTask[];
  links: VaultLink[];
  tags: string[];
  calendarCandidates: VaultCalendarCandidate[];
  unmappedItems: VaultNote[];
  openQuestions: VaultOpenQuestion[];
  techDebt: VaultTechDebtItem[];
  nextSteps: VaultNextStepSection[];
  immediateActions: string[];
  notesByFolder: Record<string, VaultNote[]>;
  stats: {
    totalNotes: number;
    totalLinks: number;
    totalTasks: number;
    totalTags: number;
    totalTechDebt: number;
    totalOpenQuestions: number;
  };
}
