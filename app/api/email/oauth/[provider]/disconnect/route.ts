import { NextRequest, NextResponse } from "next/server";
import { disconnectProviderForCurrentUser } from "@/lib/email/connections";

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const form = await request.formData();
  const connectionId = form.get("connectionId")?.toString();

  await disconnectProviderForCurrentUser(params.provider, connectionId);

  return NextResponse.redirect(new URL("/email-analyzer?toast=provider-disconnected", request.url));
}
