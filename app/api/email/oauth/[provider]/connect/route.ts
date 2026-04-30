import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/authorization";
import { createProviderAuthUrl } from "@/lib/email/oauth-service";
import { providerFromRoute } from "@/lib/email/provider-config";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  if (params.provider.toLowerCase() !== "gmail") {
    return NextResponse.redirect(new URL("/email-analyzer?error=provider_disabled", request.url));
  }

  const user = await requireCurrentUser();
  const provider = providerFromRoute(params.provider);
  const returnPath = request.nextUrl.searchParams.get("returnPath") ?? "/email-analyzer";
  const authUrl = createProviderAuthUrl({
    provider,
    userId: user.id,
    returnPath
  });

  return NextResponse.redirect(authUrl);
}
