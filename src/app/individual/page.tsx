import type { Metadata } from "next";
import ChapterHeader from "@/components/individual/ChapterHeader";
import IndividualAlbumView, {
  type PhotoCardData,
} from "@/components/individual/IndividualAlbumView";

export const metadata: Metadata = {
  title: "Early Childhood — LifeStory",
  description: "Explore memories from this chapter",
};

const photoCardsRaw: PhotoCardData[] = [
  {
    id: "woods-walk",
    src: "/dashboard/photo-1.png",
    quote: "“Walk around the woods...”",
    attribution: "~ Kolbe, your son",
  },
  {
    id: "first-birthday",
    src: "/dashboard/photo-2.png",
    quote: "“Your first birthday cake!”",
    attribution: "~ Mom",
  },
  {
    id: "backyard-swing",
    src: "/demo/photo.jpg",
    quote: "“You loved this swing in the backyard.”",
    attribution: "~ Dad",
  },
  {
    id: "family-picnic",
    src: "/dashboard/photo-1.png",
    quote: "“Our first family picnic at the lake.”",
    attribution: "~ Sarah, your sister",
  },
  {
    id: "woods-walk",
    src: "/dashboard/photo-1.png",
    quote: "“Walk around the woods...”",
    attribution: "~ Kolbe, your son",
  },
  {
    id: "first-birthday",
    src: "/dashboard/photo-2.png",
    quote: "“Your first birthday cake!”",
    attribution: "~ Mom",
  },
  {
    id: "backyard-swing",
    src: "/demo/photo.jpg",
    quote: "“You loved this swing in the backyard.”",
    attribution: "~ Dad",
  },
  {
    id: "family-picnic",
    src: "/dashboard/photo-1.png",
    quote: "“Our first family picnic at the lake.”",
    attribution: "~ Sarah, your sister",
  },
  {
    id: "woods-walk",
    src: "/dashboard/photo-1.png",
    quote: "“Walk around the woods...”",
    attribution: "~ Kolbe, your son",
  },
  {
    id: "first-birthday",
    src: "/dashboard/photo-2.png",
    quote: "“Your first birthday cake!”",
    attribution: "~ Mom",
  },
  {
    id: "backyard-swing",
    src: "/demo/photo.jpg",
    quote: "“You loved this swing in the backyard.”",
    attribution: "~ Dad",
  },
  {
    id: "family-picnic",
    src: "/dashboard/photo-1.png",
    quote: "“Our first family picnic at the lake.”",
    attribution: "~ Sarah, your sister",
  },
];

const photoCards: PhotoCardData[] = photoCardsRaw.map((card, index) => ({
  ...card,
  id: `${card.id}-${index}`,
}));

export default function IndividualPage() {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden rounded-xl bg-cream-100 p-px text-ink">
      <ChapterHeader title="Early Childhood" />
      <IndividualAlbumView photoCards={photoCards} />
    </div>
  );
}
