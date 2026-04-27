"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const toastContent: Record<string, { title: string; description: string }> = {
  "recommendation-converted": {
    title: "Task created",
    description: "The recommendation was converted and added to the project task list."
  }
};

export function FeedbackToast({ toastKey }: { toastKey?: string }) {
  const content = toastKey ? toastContent[toastKey] : undefined;
  const [open, setOpen] = useState(Boolean(content));

  useEffect(() => {
    if (!content) return;
    setOpen(true);
    const timeout = window.setTimeout(() => setOpen(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [content]);

  if (!content || !open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
      <div className="flex w-80 items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 size={16} className="text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">{content.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{content.description}</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
