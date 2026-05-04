import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/authorization";
import { createProviderAuthUrl } from "@/lib/email/oauth-service";
import { providerFromRoute } from "@/lib/email/provider-config";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  if (params.provider.toLowerCase() !== "gmail") {
    return NextResponse.redirect(
      new URL("/email-analyzer?error=provider_disabled&provider=outlook", request.url)
    );
  }

  const user = await requireCurrentUser();
  const provider = providerFromRoute(params.provider);
  const returnPath = request.nextUrl.searchParams.get("returnPath") ?? "/email-analyzer";
  const authUrl = createProviderAuthUrl({
    provider,
    userId: user.id,
    returnPath
  });

  if (request.nextUrl.searchParams.get("mode") === "url") {
    return new NextResponse(authUrl, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  return NextResponse.redirect(authUrl);
}
