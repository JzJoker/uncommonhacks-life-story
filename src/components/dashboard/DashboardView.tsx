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
                1949 - Present
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <InviteContributorsButton patientId={patientId} />
            <Button text="Add Memory" variant="primary" href={`/patient/${patientId}/new-memory`} />
            {/* <SignOutButton /> */}
          </div>
        </header>
      }
    >
      <section className="flex w-full gap-12 px-32">
        {books.length === 0 ? (
        <div className="self-center w-full  h-full flex flex-col  mb-12 items-center justify-center">
        <div className="relative flex-none -skew-x-1 w-[360px] scale-80 cursor-pointer transition-transform duration-300 ">
          <div className="relative z-10 z-40 flex h-[507px] w-full items-start overflow-hidden rounded-r-3xl bg-gray-200">
            <div className="relative z-30 h-full w-10 bg-black/10">
              <div className="pointer-events-none absolute inset-0 flex justify-between">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-full w-px bg-white/10" />
                ))}
              </div>
            </div>
            <div className="relative grid h-full w-full place-items-center p-12 group-hover:scale-95">
              <div className="absolute top-1/2 left-1/2 z-3 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300 group-hover:-translate-x-[calc(50%-24px)] group-hover:rotate-4">
                <div className="relative aspect-square w-full  grid place-items-center overflow-hidden bg-gray-100">
                  <div className="w-[120px] aspect-square bg-white z-20  rounded-full relative" />
                  <div className="w-[130px] aspect-square bg-white z-20 absolute bottom-0 left-1/2 -translate-x-1/2  translate-y-1/2 rounded-t-full " />
                </div>
              </div>
            </div>
          </div>
          <div>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((d, i) => (
              <div
                key={d}
                className="absolute inset-0 rounded-r-3xl border border-l-0 border-black/20 bg-white"
                style={{
                  transform: `translate(${i * 2}px, ${i * 2}px)`,
                  zIndex: 24 - i,
                }}
              />
            ))}
          </div>
        </div>
        <Link href={`/patient/${patientId}/new-memory`}>
          <Button variant="primary" className="cursor-pointer flex gap-1">
            <span>Add {patientName}&apos;s </span>
            <span className="font-hand text-[24px] ">first memory</span>
          </Button>
        </Link>
      </div>
        ) : (
          books.map((book) => (
            <BookFrame
              key={book.id}
              title={book.name}
              dateRange={book.relation ?? ""}
              coverImages={book.coverImages}
              albumHref={`/patient/${patientId}/person/${book.id}`}
            />
          ))
        )}
      </section>
    </HorizontalScroll>
  );
}
