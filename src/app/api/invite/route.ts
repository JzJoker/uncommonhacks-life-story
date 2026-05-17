import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { patientId, email } = await req.json();
  if (!patientId || !email) {
    return NextResponse.json({ error: "patientId and email are required" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  // Record the invite for the caregiver's contributors list. Duplicates are
  // ignored silently — re-inviting the same email is allowed and should still
  // send a fresh link.
  await supabaseAdmin
    .from("patient_contributors")
    .upsert({ patient_id: patientId, email }, { onConflict: "patient_id,email", ignoreDuplicates: true });

  // Send a magic link that drops the recipient straight on the new-memory
  // view for this patient. Works for any email — no prior account required,
  // and re-invites don't error out the way inviteUserByEmail does.
  const { error: linkError } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?patientId=${patientId}`,
    },
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
