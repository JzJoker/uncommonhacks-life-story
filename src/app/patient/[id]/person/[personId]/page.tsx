import { supabase } from "@/lib/supabase";
import ChapterHeader from "@/components/individual/ChapterHeader";
import IndividualAlbumView, { type PhotoCardData } from "@/components/individual/IndividualAlbumView";

export default async function PersonAlbumPage(props: {
  params: Promise<{ id: string; personId: string }>;
}) {
  const { id: patientId, personId } = await props.params;

  const [{ data: person }, { data: memoryPeople }] = await Promise.all([
    supabase
      .from("friends_family")
      .select("name, relation")
      .eq("id", personId)
      .single(),
    supabase
      .from("memory_people")
      .select(`
        id,
        memories (
          id,
          image_url,
          answer_who_is_this,
          answer_whats_going_on
        )
      `)
      .eq("friend_family_id", personId),
  ]);

  const name = person?.name ?? "Unknown";
  const relation = person?.relation ?? null;

  const photoCards: PhotoCardData[] = (memoryPeople ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((mp: any) => mp.memories?.image_url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((mp: any, i: number) => ({
      id: `${mp.id}-${i}`,
      src: mp.memories.image_url as string,
      quote: (mp.memories.answer_whats_going_on || mp.memories.answer_who_is_this || "") as string,
      attribution: relation ? `${name}, your ${relation.toLowerCase()}` : name,
    }));

  const bio = relation
    ? `Browse your memories with ${name}, your ${relation.toLowerCase()}.`
    : `Browse your memories with ${name}.`;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden rounded-xl bg-cream-100 p-px text-ink">
      <ChapterHeader title={`${name}'s Album`} backHref={`/patient/${patientId}`} />
      {photoCards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-base font-light text-muted">No memories yet.</p>
        </div>
      ) : (
        <IndividualAlbumView
          photoCards={photoCards}
          personName={name}
          personBio={bio}
        />
      )}
    </div>
  );
}
