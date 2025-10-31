import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/chat", "/archive", "/settings"],
};

export async function middleware(request: NextRequest) {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : request.nextUrl.origin;

    const res = await fetch(`${baseUrl}/api/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    });

    const session = await res.json();

    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error("Middleware error:", err);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
