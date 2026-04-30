import { NextRequest, NextResponse } from "next/server";
import { disconnectProviderForCurrentUser } from "@/lib/email/connections";

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    const expected = `https://${host}`;
    const expectedHttp = `http://${host}`;
    if (origin !== expected && origin !== expectedHttp) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  const form = await request.formData();
  const connectionId = form.get("connectionId")?.toString();

  await disconnectProviderForCurrentUser(params.provider, connectionId);

  return NextResponse.redirect(new URL("/email-analyzer?toast=provider-disconnected", request.url));
}
