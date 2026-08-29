import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return clearAuthCookies(NextResponse.json({ ok: true }));
}
