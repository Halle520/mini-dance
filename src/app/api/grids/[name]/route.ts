import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const current = await getSession();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await params;
  const target = decodeURIComponent(name);
  if (!isAdmin(current) && current !== target) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("dance_grids").select("*").eq("user_name", target).single();
  if (error && error.code === "PGRST116") return NextResponse.json(null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const current = await getSession();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await params;
  const target = decodeURIComponent(name);
  if (!isAdmin(current) && current !== target) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as { grid?: unknown; row_notes?: unknown };
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dance_grids")
    .upsert(
      { user_name: target, grid: body.grid ?? [], row_notes: body.row_notes ?? [], updated_at: new Date().toISOString() },
      { onConflict: "user_name" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const current = await getSession();
  if (!current || !isAdmin(current)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await params;
  const target = decodeURIComponent(name);
  const supabase = createServerClient();
  const { error } = await supabase.from("dance_grids").delete().eq("user_name", target);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
