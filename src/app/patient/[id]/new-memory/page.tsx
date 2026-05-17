import { supabase } from "@/lib/supabase";
import { NewMemoryForm } from "@/components/NewMemoryForm";

export default async function PatientNewMemoryPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", id)
    .single();

  return <NewMemoryForm patientId={id} patientName={patient?.name ?? "them"} />;
}
