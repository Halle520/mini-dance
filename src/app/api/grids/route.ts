import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const name = await getSession();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  if (!isAdmin(name)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { data, error } = await supabase
    .from("dance_grids")
    .select("user_name, updated_at, grid, row_notes")
    .order("user_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
