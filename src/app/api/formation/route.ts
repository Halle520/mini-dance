import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { parseFormation } from "@/lib/formation";

export async function GET() {
  const name = await getSession();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("formation").select("positions").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(parseFormation(data?.positions ?? []));
}
