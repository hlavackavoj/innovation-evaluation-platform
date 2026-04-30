"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ConnectGmailButtonProps = {
  returnPath?: string;
};

export function ConnectGmailButton({ returnPath = "/email-analyzer" }: ConnectGmailButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setIsConnecting(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        returnPath,
        mode: "url"
      });
      const response = await fetch(`/api/email/oauth/gmail/connect?${query.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`OAuth connect failed with status ${response.status}`);
      }

      const authUrl = (await response.text()).trim();
      if (!authUrl) {
        throw new Error("OAuth connect did not return an authorization URL.");
      }

      window.location.href = authUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start Gmail OAuth flow.";
      setError(message);
      setIsConnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : "Connect Gmail"}
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
