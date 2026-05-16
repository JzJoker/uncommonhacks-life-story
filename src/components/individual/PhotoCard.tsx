import Image from "next/image";

type PhotoCardProps = {
  src?: string;
  quote?: string;
  attribution?: string;
};

export default function PhotoCard({
  src = "/dashboard/photo-1.png",
  quote = "“Walk around the woods...”",
  attribution = "~ Kolbe, your son",
}: PhotoCardProps) {
  return (
    <article className="flex w-[360px] shrink-0 flex-col items-center gap-4 rounded border border-cream-100 bg-polaroid p-4 shadow-[4px_4px_4px_rgba(0,0,0,0.04)]">
      <div className="relative h-[252px] w-full overflow-hidden rounded">
        <Image src={src} alt="" fill className="object-cover" sizes="360px" />
      </div>
      <div className="flex w-full flex-col items-center gap-2 py-3">
        <p className="text-center text-base font-light text-ink">{quote}</p>
        <p className="text-center text-xs text-muted">{attribution}</p>
      </div>
    </article>
  );
}
