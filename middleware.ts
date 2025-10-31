import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const config = {
  matcher: ["/chat", "/archive", "/settings"],
  runtime: "nodejs", // 👈 forces Node.js runtime, not Edge
};

export async function middleware(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    // If not logged in, redirect to /login
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Otherwise, allow the request
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
