"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type PhotoCardProps = {
  src?: string;
  quote?: string;
  attribution?: string;
  className?: string;
  compact?: boolean;
  messageAudioUrl?: string | null;
};

export default function PhotoCard({
  src = "/dashboard/photo-1.png",
  quote = "",
  attribution = "",
  className = "",
  messageAudioUrl,
}: PhotoCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  return (
    <article
      className={`flex w-[360px] shrink-0 flex-col items-center gap-4 rounded border border-cream-100 bg-polaroid p-4 shadow-[4px_4px_4px_rgba(0,0,0,0.04)] ${className}`.trim()}
    >
      <div className="relative h-[252px] w-full overflow-hidden rounded">
        <Image src={src} alt="" fill className="object-cover" sizes="360px" unoptimized />

        {messageAudioUrl && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={audioRef}
              src={messageAudioUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause message" : "Play message"}
              className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            >
              {playing ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
            </button>
          </>
        )}
      </div>
      <div className="flex w-full flex-col items-center gap-2 py-3">
        <p className="text-center text-base font-light text-ink">{quote}</p>
        <p className="text-center text-xs text-muted">{attribution}</p>
      </div>
    </article>
  );
}
