import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const name = await getCurrentUser();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dance_grids")
    .select("*")
    .eq("user_name", name)
    .single();
  if (error && error.code === "PGRST116") return NextResponse.json(null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
