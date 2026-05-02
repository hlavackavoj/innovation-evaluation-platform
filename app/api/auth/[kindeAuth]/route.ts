import { NextResponse } from "next/server";
import { getMissingKindeEnv } from "@/lib/env";

export async function GET(request: Request, context: unknown) {
  const missing = getMissingKindeEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Kinde auth is not configured.",
        missing
      },
      { status: 503 }
    );
  }

  const { handleAuth } = await import("@kinde-oss/kinde-auth-nextjs/server");
  const handler = handleAuth();
  return handler(request, context);
}
