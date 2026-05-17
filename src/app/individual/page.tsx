import type { Metadata } from "next";
import ChapterHeader from "@/components/individual/ChapterHeader";
import IndividualAlbumView, {
  type PhotoCardData,
} from "@/components/individual/IndividualAlbumView";

export const metadata: Metadata = {
  title: "Early Childhood — LifeStory",
  description: "Explore memories from this chapter",
};

const photoCards: PhotoCardData[] = [
  { id: "1", src: "/dashboard/photo-1.png", quote: "Walk around the woods...",               attribution: "Kolbe, your son",     memoryId: "", imageWidth: null, imageHeight: null },
  { id: "2", src: "/dashboard/photo-2.png", quote: "Your first birthday cake!",              attribution: "Mom",                  memoryId: "", imageWidth: null, imageHeight: null },
  { id: "3", src: "/demo/photo.jpg",        quote: "You loved this swing in the backyard.",  attribution: "Dad",                  memoryId: "", imageWidth: null, imageHeight: null },
  { id: "4", src: "/dashboard/photo-1.png", quote: "Our first family picnic at the lake.",   attribution: "Sarah, your sister",   memoryId: "", imageWidth: null, imageHeight: null },
  { id: "5", src: "/dashboard/photo-1.png", quote: "Walk around the woods...",               attribution: "Kolbe, your son",     memoryId: "", imageWidth: null, imageHeight: null },
  { id: "6", src: "/dashboard/photo-2.png", quote: "Your first birthday cake!",              attribution: "Mom",                  memoryId: "", imageWidth: null, imageHeight: null },
  { id: "7", src: "/demo/photo.jpg",        quote: "You loved this swing in the backyard.",  attribution: "Dad",                  memoryId: "", imageWidth: null, imageHeight: null },
  { id: "8", src: "/dashboard/photo-1.png", quote: "Our first family picnic at the lake.",   attribution: "Sarah, your sister",   memoryId: "", imageWidth: null, imageHeight: null },
];

export default function IndividualPage() {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden rounded-xl bg-cream-100 p-px text-ink">
      <ChapterHeader title="Early Childhood" />
      <IndividualAlbumView photoCards={photoCards} personId="" patientId="" />
    </div>
  );
}
