import Link from "next/link";
import BookFrame from "@/components/dashboard/BookFrame";
import Button from "@/components/dashboard/Button";
import HorizontalScroll from "@/components/dashboard/HorizontalScroll";
import InviteContributorsButton from "@/components/dashboard/InviteContributorsButton";
import { SignOutButton } from "@/components/SignOutButton";
import { supabase } from "@/lib/supabase";

import type { CoverImage } from "@/components/dashboard/BookFrame";

type PersonBook = {
  id: string;
  name: string;
  relation: string | null;
  coverImages: CoverImage[];
};

async function fetchBooks(patientId: string): Promise<PersonBook[]> {
  const { data, error } = await supabase
    .from("friends_family")
    .select(`
      id,
      name,
      relation,
      memory_people (
        bbox_x,
        bbox_y,
        bbox_w,
        bbox_h,
        memories (
          image_url,
          image_width,
          image_height
        )
      )
    `)
    .eq("patient_id", patientId)
    .order("name");

  if (error || !data) return [];

  return data.map((person) => ({
    id: person.id,
    name: person.name,
    relation: person.relation,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coverImages: (person.memory_people as any[])
      .filter((mp) => mp.memories?.image_url)
      .map((mp) => ({
        url: mp.memories.image_url as string,
        bbox:
          mp.bbox_x != null
            ? ([mp.bbox_x, mp.bbox_y, mp.bbox_w, mp.bbox_h] as [number, number, number, number])
            : null,
        imageWidth: (mp.memories.image_width as number) ?? null,
        imageHeight: (mp.memories.image_height as number) ?? null,
      })),
  }));
}

export default async function DashboardView({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const books = await fetchBooks(patientId);

  return (
    <HorizontalScroll
      className="fixed inset-0 flex flex-col justify-center gap-0 overflow-x-hidden bg-cream-50 py-16 text-ink"
      viewportClassName="min-h-0 flex h-full w-full flex-1 overflow-x-auto overscroll-x-contain scrollbar-hide"
      header={
        <header className="flex w-full shrink-0 items-start justify-between px-32">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="font-hand text-[32px] leading-normal text-ink">
                {patientName}&apos;s Life
              </h1>
              <p className="text-2xl font-light leading-normal text-muted">
                1999 - Present
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <InviteContributorsButton patientId={patientId} />
            <Button text="Add Memory" href={`/patient/${patientId}/new-memory`} />
            <SignOutButton />
          </div>
        </header>
      }
    >
      <section className="flex w-max gap-12 px-32">
        {books.length === 0 ? (
          <div className="self-center flex flex-col gap-4 items-start">
            <p className="font-light text-muted">No memories yet.</p>
            <Link href={`/patient/${patientId}/new-memory`}>
              <button className="text-sm font-light text-ink underline underline-offset-2">
                Add the first memory →
              </button>
            </Link>
          </div>
        ) : (
          books.map((book) => (
            <BookFrame
              key={book.id}
              title={book.name}
              dateRange={book.relation ?? ""}
              coverImages={book.coverImages}
            />
          ))
        )}
      </section>
    </HorizontalScroll>
  );
}
