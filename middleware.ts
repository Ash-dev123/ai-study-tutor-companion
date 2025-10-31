import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/chat", "/archive", "/settings"],
};

export async function middleware(request: NextRequest) {
  try {
    // Call your API route instead of directly importing auth
    const res = await fetch(`${request.nextUrl.origin}/api/session`);
    const session = await res.json();

    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
