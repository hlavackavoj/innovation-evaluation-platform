import type { Contact, Project, ProjectContact } from "@prisma/client";
import type { NormalizedEmailMessage } from "@/lib/email/types";

type ContactWithOrgDomain = ProjectContact & {
  contact: Contact & {
    organization: {
      website: string | null;
    } | null;
  };
};

export type MatchReason =
  | "contact_email_exact"
  | "organization_domain"
  | "keyword_alias"
  | "none";

export type MatchResult = {
  matched: boolean;
  confidence: number;
  reason: MatchReason;
};

function extractDomain(email: string): string | null {
  const [, domain] = email.toLowerCase().split("@");
  return domain || null;
}

function websiteDomain(website?: string | null): string | null {
  if (!website) return null;

  try {
    const url = website.startsWith("http") ? new URL(website) : new URL(`https://${website}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.toLowerCase() || null;
  }
}

function participants(message: NormalizedEmailMessage): string[] {
  const all = [
    ...message.participants.from,
    ...message.participants.to,
    ...message.participants.cc,
    ...message.participants.bcc
  ];

  return [...new Set(all.map((p) => p.email.toLowerCase()))];
}

export function matchEmailToProject(
  project: Pick<Project, "title">,
  contacts: ContactWithOrgDomain[],
  keywordAliases: string[],
  message: NormalizedEmailMessage
): MatchResult {
  const emailParticipants = participants(message);

  const contactEmails = new Set(
    contacts
      .map((link) => link.contact.email?.toLowerCase())
      .filter((email): email is string => !!email)
  );

  if (emailParticipants.some((email) => contactEmails.has(email))) {
    return {
      matched: true,
      confidence: 1,
      reason: "contact_email_exact"
    };
  }

  const orgDomains = new Set(
    contacts
      .map((link) => websiteDomain(link.contact.organization?.website))
      .filter((domain): domain is string => !!domain)
  );

  const participantDomains = emailParticipants
    .map(extractDomain)
    .filter((domain): domain is string => !!domain);

  if (participantDomains.some((domain) => orgDomains.has(domain))) {
    return {
      matched: true,
      confidence: 0.7,
      reason: "organization_domain"
    };
  }

  const searchText = `${message.subject || ""} ${message.snippet || ""} ${message.bodyText || ""}`.toLowerCase();
  const keywords = [project.title, ...keywordAliases].map((value) => value.toLowerCase()).filter(Boolean);

  if (keywords.some((keyword) => searchText.includes(keyword))) {
    return {
      matched: true,
      confidence: 0.45,
      reason: "keyword_alias"
    };
  }

  return {
    matched: false,
    confidence: 0,
    reason: "none"
  };
}
