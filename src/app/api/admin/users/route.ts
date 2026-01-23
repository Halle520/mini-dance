import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { GRID_SIZE } from "@/lib/constants";

function emptyGrid() {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(false));
}

export async function POST(req: NextRequest) {
  const current = await getSession();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(current)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { name } = (await req.json()) as { name?: string };
  const trimmed = (name ?? "").toString().trim();
  if (!trimmed) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dance_grids")
    .upsert(
      { user_name: trimmed, grid: emptyGrid(), row_notes: Array(GRID_SIZE).fill(""), updated_at: new Date().toISOString() },
      { onConflict: "user_name" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
