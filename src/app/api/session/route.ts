import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth.api.getSession();
    return NextResponse.json(session || {});
  } catch (error) {
    console.error("Session API error:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
