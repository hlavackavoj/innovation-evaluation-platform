import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/email/oauth-service";
import { providerFromRoute } from "@/lib/email/provider-config";
import { runPostConnectInitialSync } from "@/lib/email/post-connect-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  if (params.provider.toLowerCase() !== "gmail") {
    return NextResponse.redirect(new URL("/email-analyzer?error=provider_disabled", request.url));
  }

  const provider = providerFromRoute(params.provider);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/email-analyzer?error=oauth_provider_error", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/email-analyzer?error=missing_oauth_code", request.url));
  }

  try {
    const result = await handleOAuthCallback({
      provider,
      code,
      state
    });

    void runPostConnectInitialSync({
      userId: result.userId,
      provider: result.provider,
      connectionId: result.connectionId,
      maxMessages: 50
    }).catch((syncError) => {
      console.error("INITIAL_EMAIL_SYNC_FAILED", syncError);
    });

    const redirectUrl = new URL(result.redirectTarget);
    redirectUrl.searchParams.set("toast", "provider-connected");
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("OAUTH_CALLBACK_FAILED", err);
    return NextResponse.redirect(
      new URL("/email-analyzer?error=oauth_callback_failed", request.url)
    );
  }
}
