import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth.api.getSession();
  return NextResponse.json(session || {});
}
