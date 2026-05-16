"use client";

import Image from "next/image";
import { Play, Pause } from "lucide-react";
import { useState } from "react";

type PhotoCardProps = {
  photoSrc: string;
  photoAlt?: string;
  quote: string;
  contributorName: string;
  contributorRelation: string;
  contributorAvatarSrc?: string;
  title: string;
  recordedDate: string;
  onPlay?: () => void;
  className?: string;
};

export function PhotoCard({
  photoSrc,
  photoAlt = "",
  quote,
  contributorName,
  contributorRelation,
  contributorAvatarSrc,
  title,
  recordedDate,
  onPlay,
  className = "",
}: PhotoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying((p) => !p);
    onPlay?.();
  };

  return (
    <article
      className={[
        "bg-polaroid border border-cream-100 rounded-[4px]",
        "w-[360px] p-4 flex flex-col gap-9 items-center",
        "shadow-[4px_4px_4px_0_rgba(0,0,0,0.04)]",
        className,
      ].join(" ")}
    >
      <div className="w-full h-[252px] rounded-[4px] overflow-hidden bg-[#f1f1f1] relative">
        <Image
          src={photoSrc}
          alt={photoAlt}
          fill
          sizes="328px"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col items-center gap-2 w-full text-center">
        {contributorAvatarSrc && (
          <div className="relative size-[42px] rounded-full overflow-hidden bg-cream-50">
            <Image
              src={contributorAvatarSrc}
              alt={`${contributorName} avatar`}
              fill
              sizes="42px"
              className="object-cover"
            />
          </div>
        )}
        <p className="text-base font-light text-ink">&ldquo;{quote}&rdquo;</p>
        <p className="text-xs text-muted">
          ~ {contributorName}, {contributorRelation}
        </p>
      </div>

      <div className="flex items-end justify-between w-full">
        <div className="flex flex-col gap-1">
          <h3 className="font-hand text-[24px] leading-none text-ink">
            {title}
          </h3>
          <p className="text-base font-light text-muted">
            Recorded {recordedDate}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePlay}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          aria-pressed={isPlaying}
          className={[
            "bg-ink text-paper rounded-full p-4",
            "inline-flex items-center justify-center",
            "transition-transform hover:scale-105 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
          ].join(" ")}
        >
          {isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </button>
      </div>
    </article>
  );
}

export default PhotoCard;
