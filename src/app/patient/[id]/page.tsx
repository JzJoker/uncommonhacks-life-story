import { supabase } from "@/lib/supabase";
import DashboardView from "@/components/dashboard/DashboardView";
import Link from "next/link";

export default async function PatientPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const { data: patient } = await supabase
    .from("patients")
    .select("name, experience_mode")
    .eq("id", id)
    .single();

  return <DashboardView patientId={id} patientName={patient?.name ?? "their"} />;
}
