import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { parseFormation, type FormationData } from "@/lib/formation";

export async function GET() {
  const name = await getSession();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(name)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("formation").select("positions").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(parseFormation(data?.positions ?? []));
}

export async function PUT(req: NextRequest) {
  const name = await getSession();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(name)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = (await req.json()) as FormationData;
  const { cols, rows, slots } = parseFormation(body);
  const supabase = createServerClient();
  const payload = { cols, rows, slots };
  const { error } = await supabase
    .from("formation")
    .upsert({ id: 1, positions: payload }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(payload);
}
