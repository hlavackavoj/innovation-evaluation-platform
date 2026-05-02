import type { UniversityPhaseSuggestion } from "@/lib/constants";

type TriggerRule = {
  pattern: RegExp;
  phase: UniversityPhaseSuggestion;
};

const TRIGGER_RULES: TriggerRule[] = [
  {
    pattern: /smlouv|podpis\s+smlouv|podepsán|contract\s+sign|agreement\s+sign|nda\s+sign|signed\s+agreement/i,
    phase: "CONTRACTING"
  },
  {
    pattern: /grantov[aá]\s+žádost|grant\s+appl|žádost\s+o\s+grant|grant\s+proposal|grant\s+approved|podpis\s+grantu|budget\s+approv|financov[aá]ní\s+schváleno/i,
    phase: "CONTRACTING"
  },
  {
    pattern: /realizace\s+zahájena|projekt\s+zahájen|kick.?off|project\s+started|implementation\s+start|průběžn[aá]\s+zpráv|progress\s+report|active\s+milestone/i,
    phase: "IMPLEMENTATION"
  },
  {
    pattern: /závěrečn[aá]\s+zpráv|final\s+report|deliverable|výstup\s+projektu|odevzdání|project\s+clos|spin.?off\s+readiness|výsledky\s+projektu/i,
    phase: "DELIVERY"
  },
  {
    pattern: /výzkumný\s+záměr|research\s+idea|nový\s+nápad|new\s+concept|počáteční\s+zájem|initial\s+interest|exploratory|feasibility/i,
    phase: "IDEATION"
  }
];

export function detectPhaseFromText(text: string): UniversityPhaseSuggestion | null {
  if (!text || text.trim().length === 0) return null;
  for (const rule of TRIGGER_RULES) {
    if (rule.pattern.test(text)) return rule.phase;
  }
  return null;
}
