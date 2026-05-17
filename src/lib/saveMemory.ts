import { supabase } from "./supabase";

type Person = {
  name: string;
  relation: string | null;
  bbox: [number, number, number, number];
  score: number;
};

type SaveMemoryArgs = {
  patientId: string;
  imageFile: File;
  naturalSize: { w: number; h: number };
  people: Person[];
  answers: [string, string, string, string];
};

export async function saveMemory({ patientId, imageFile, naturalSize, people, answers }: SaveMemoryArgs) {
  // 1. Upload image to Storage
  const filename = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { data: storageData, error: storageError } = await supabase.storage
    .from("memories")
    .upload(filename, imageFile, { upsert: false });
  if (storageError) throw storageError;

  const { data: { publicUrl } } = supabase.storage
    .from("memories")
    .getPublicUrl(storageData.path);

  // 2. Insert memory record
  const { data: memory, error: memError } = await supabase
    .from("memories")
    .insert({
      patient_id: patientId,
      image_url: publicUrl,
      image_width: naturalSize.w,
      image_height: naturalSize.h,
      answer_who_is_this:    answers[0] || null,
      answer_whats_going_on: answers[1] || null,
      answer_recognize:      answers[2] || null,
      answer_upset:          answers[3] || null,
    })
    .select("id")
    .single();
  if (memError) throw memError;

  // 3. Save each identified person
  for (const person of people) {
    let friendFamilyId: string | null = null;

    if (person.name.trim()) {
      const { data: existing } = await supabase
        .from("friends_family")
        .select("id")
        .eq("patient_id", patientId)
        .eq("name", person.name.trim())
        .maybeSingle();

      if (existing) {
        friendFamilyId = existing.id;
        if (person.relation) {
          await supabase
            .from("friends_family")
            .update({ relation: person.relation })
            .eq("id", existing.id);
        }
      } else {
        const { data: ff, error: ffError } = await supabase
          .from("friends_family")
          .insert({ patient_id: patientId, name: person.name.trim(), relation: person.relation || null })
          .select("id")
          .single();
        if (ffError) throw ffError;
        friendFamilyId = ff.id;
      }
    }

    const { error: mpError } = await supabase.from("memory_people").insert({
      memory_id:        memory.id,
      friend_family_id: friendFamilyId,
      name:             person.name.trim() || null,
      bbox_x:           person.bbox[0],
      bbox_y:           person.bbox[1],
      bbox_w:           person.bbox[2],
      bbox_h:           person.bbox[3],
      detection_score:  person.score,
    });
    if (mpError) throw mpError;
  }
}
