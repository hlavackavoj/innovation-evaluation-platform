export function formatIcsDateTime(isoString: string): string {
  return isoString.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace(/Z$/, "Z");
}

export function formatIcsDate(isoString: string): string {
  return isoString.slice(0, 10).replace(/-/g, "");
}

export function addMinutesToIso(isoString: string, minutes: number): string {
  const d = new Date(new Date(isoString).getTime() + minutes * 60 * 1000);
  return d.toISOString();
}

export function buildIcsContent(
  title: string,
  startIso: string,
  durationMinutes = 60,
  dtstampReferenceIso?: string
): string {
  const endIso = addMinutesToIso(startIso, durationMinutes);
  const now = formatIcsDateTime(dtstampReferenceIso ?? new Date().toISOString());
  const uid = `${formatIcsDateTime(startIso)}-${Math.random().toString(36).slice(2)}@iep`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IEP//Email Analyzer//CS",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDateTime(startIso)}`,
    `DTEND:${formatIcsDateTime(endIso)}`,
    `SUMMARY:${title.replace(/[\\;,]/g, "\\$&")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

export function buildIcsAllDayContent(title: string, dateIso: string, dtstampReferenceIso?: string): string {
  const now = formatIcsDateTime(dtstampReferenceIso ?? new Date().toISOString());
  const uid = `${formatIcsDate(dateIso)}-allday-${Math.random().toString(36).slice(2)}@iep`;
  const next = new Date(dateIso);
  next.setDate(next.getDate() + 1);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IEP//Email Analyzer//CS",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(dateIso)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(next.toISOString())}`,
    `SUMMARY:${title.replace(/[\\;,]/g, "\\$&")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

export function buildGoogleCalendarUrl(title: string, startIso: string, durationMinutes = 60): string {
  const endIso = addMinutesToIso(startIso, durationMinutes);
  const fmt = (iso: string) => formatIcsDateTime(iso);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(startIso)}/${fmt(endIso)}`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildGoogleCalendarAllDayUrl(title: string, dateIso: string): string {
  const date = formatIcsDate(dateIso);
  const next = new Date(dateIso);
  next.setDate(next.getDate() + 1);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${date}/${formatIcsDate(next.toISOString())}`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function resolveSuggestedActionDueDateIso(
  action: { proposedDateTime?: string | null; deadline?: string | null; dueDays?: number | null },
  referenceDateIso: string
): string | null {
  if (action.proposedDateTime) {
    const proposed = new Date(action.proposedDateTime);
    if (!Number.isNaN(proposed.getTime())) {
      return proposed.toISOString();
    }
  }

  if (action.deadline) {
    const deadline = new Date(action.deadline);
    if (!Number.isNaN(deadline.getTime())) {
      return deadline.toISOString();
    }
  }

  if (typeof action.dueDays === "number" && Number.isFinite(action.dueDays)) {
    const reference = new Date(referenceDateIso);
    if (Number.isNaN(reference.getTime())) {
      return null;
    }
    reference.setDate(reference.getDate() + Math.round(action.dueDays));
    return reference.toISOString();
  }

  return null;
}
