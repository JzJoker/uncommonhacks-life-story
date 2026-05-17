import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { patientId, email } = await req.json();
  if (!patientId || !email) {
    return NextResponse.json({ error: "patientId and email are required" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  // Insert the contributor record (idempotent — ignore conflict on duplicate)
  const { error: insertError } = await supabaseAdmin
    .from("patient_contributors")
    .upsert({ patient_id: patientId, email }, { onConflict: "patient_id,email", ignoreDuplicates: true });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Send the invite email via Supabase Auth
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
