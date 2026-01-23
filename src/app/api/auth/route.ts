import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, setSession } from "@/lib/auth";

export async function GET() {
  const name = await getCurrentUser();
  return NextResponse.json({ name: name ?? null });
}

export async function POST(req: NextRequest) {
  const { name } = (await req.json()) as { name?: string };
  const trimmed = (name ?? "").toString().trim();
  if (!trimmed) return NextResponse.json({ error: "Name required" }, { status: 400 });
  await setSession(trimmed);
  return NextResponse.json({ ok: true });
}
