import { NextResponse } from "next/server";
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { hasProjectsAccessByKindeRole } from "@/lib/kinde-roles";

export default withAuth((req: any) => {
  const roleClaim = req.kindeAuth?.token?.roles ?? req.kindeAuth?.token?.["x-hasura-roles"];

  if (hasProjectsAccessByKindeRole(roleClaim)) {
    return NextResponse.next();
  }

  const url = new URL("/", req.nextUrl.origin);
  url.searchParams.set("pending_approval", "1");
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/projects/:path*"]
};
