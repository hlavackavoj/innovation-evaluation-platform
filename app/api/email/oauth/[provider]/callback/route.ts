import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/email/oauth-service";
import { providerFromRoute } from "@/lib/email/provider-config";
import { runPostConnectInitialSync } from "@/lib/email/post-connect-sync";

function resolveOAuthErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("oauth state expired")) return "oauth_state_expired";
  if (message.includes("state signature")) return "oauth_state_invalid";
  if (message.includes("provider mismatch")) return "oauth_provider_mismatch";
  if (message.includes("redirect_uri_mismatch")) return "oauth_redirect_uri_mismatch";
  if (message.includes("invalid_grant")) return "oauth_invalid_grant";
  if (message.includes("did not return access token")) return "oauth_missing_access_token";
  if (message.includes("token exchange")) return "oauth_token_exchange_failed";
  if (message.includes("gmail profile")) return "oauth_profile_fetch_failed";

  return "oauth_callback_failed";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  if (params.provider.toLowerCase() !== "gmail") {
    return NextResponse.redirect(
      new URL("/email-analyzer?error=provider_disabled&provider=outlook", request.url)
    );
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
    const errorCode = resolveOAuthErrorCode(err);
    return NextResponse.redirect(
      new URL(`/email-analyzer?error=${errorCode}`, request.url)
    );
  }
}
