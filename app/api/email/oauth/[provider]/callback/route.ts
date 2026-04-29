import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/email/oauth-service";
import { providerFromRoute } from "@/lib/email/provider-config";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = providerFromRoute(params.provider);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/email-analyzer?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/email-analyzer?error=missing_oauth_code", request.url));
  }

  try {
    const redirectTarget = await handleOAuthCallback({
      provider,
      code,
      state
    });

    return NextResponse.redirect(`${redirectTarget}?toast=provider-connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_callback_failed";
    return NextResponse.redirect(
      new URL(`/email-analyzer?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
