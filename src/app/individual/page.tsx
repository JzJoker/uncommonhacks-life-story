import type { Metadata } from "next";
import Button from "@/components/dashboard/Button";
import ChapterHeader from "@/components/individual/ChapterHeader";
import PhotoCard from "@/components/individual/PhotoCard";

export const metadata: Metadata = {
  title: "Early Childhood — LifeStory",
  description: "Explore memories from this chapter",
};

export default function IndividualPage() {
  return (
    <div className="flex min-h-full flex-col overflow-hidden rounded-xl h-dvh bg-cream-100 p-px text-ink">
      <ChapterHeader title="Early Childhood" />
      <div className="w-full h-full p-12  bg-white/40 ">
        <div className="flex flex-1 bg-cream-100 w-full  rounded-xl overflow-hidden h-full items-center justify-center gap-px">
          <div className="w-full h-full grid bg-cream-50 place-items-center">
            <PhotoCard />
          </div>

          <div className="w-full h-full grid bg-cream-50  place-items-center">
            <section className="flex max-w-[360px] flex-col items-start justify-center gap-6">
              <h2 className="font-hand text-[28px] leading-normal text-ink">
                Andy Lin
              </h2>
              <p className="text-base font-light leading-normal text-ink">
                Family members can create a private digital space full of
                photos, stories, and voices that celebrate Andy&apos;s life and
                bring him closer to people he loves.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button text="See more of Justin" variant="primary" />
                <Button text="Ask a question" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
