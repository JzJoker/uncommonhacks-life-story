"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Spotlight glow overlay — same canvas approach as NewMemoryForm,            */
/* but uses Math.max (object-cover) instead of Math.min (object-contain)     */
/* -------------------------------------------------------------------------- */

type Rect = { x: number; y: number; w: number; h: number };

function perimeterPoint(t: number, r: Rect): [number, number] {
  const { x, y, w, h } = r;
  const p = 2 * (w + h);
  const d = (((t % 1) + 1) % 1) * p;
  if (d < w)         return [x + d, y];
  if (d < w + h)     return [x + w, y + (d - w)];
  if (d < 2 * w + h) return [x + w - (d - w - h), y + h];
  return [x, y + h - (d - 2 * w - h)];
}

function drawGlowBorder(offCtx: CanvasRenderingContext2D, rect: Rect, headT: number, N: number) {
  offCtx.strokeStyle = "white";
  offCtx.lineWidth = 3;
  offCtx.lineCap = "butt";

  for (let i = 0; i < N; i++) {
    const t = i / N;
    let dist = Math.abs(t - headT);
    if (dist > 0.5) dist = 1 - dist;
    offCtx.globalAlpha = 0.12 + 0.88 * Math.pow(1 - dist * 2, 2);
    const [x1, y1] = perimeterPoint(t, rect);
    const [x2, y2] = perimeterPoint((i + 1) / N, rect);
    offCtx.beginPath();
    offCtx.moveTo(x1, y1);
    offCtx.lineTo(x2, y2);
    offCtx.stroke();
  }

  const HOT = 0.08;
  offCtx.lineWidth = 5;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    let dist = Math.abs(t - headT);
    if (dist > 0.5) dist = 1 - dist;
    if (dist > HOT) continue;
    offCtx.globalAlpha = Math.pow(1 - dist / HOT, 2);
    const [x1, y1] = perimeterPoint(t, rect);
    const [x2, y2] = perimeterPoint((i + 1) / N, rect);
    offCtx.beginPath();
    offCtx.moveTo(x1, y1);
    offCtx.lineTo(x2, y2);
    offCtx.stroke();
  }
  offCtx.globalAlpha = 1;
  offCtx.lineWidth = 4;
}

function PeopleBoxHighlight({
  boxes,
  imageWidth,
  imageHeight,
}: {
  boxes: [number, number, number, number][];
  imageWidth: number;
  imageHeight: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ rects: Rect[]; cW: number; cH: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: cW, height: cH } = entry.contentRect;
      canvas.width = cW;
      canvas.height = cH;
      const scale = Math.max(cW / imageWidth, cH / imageHeight);
      const ox = (cW - imageWidth * scale) / 2;
      const oy = (cH - imageHeight * scale) / 2;
      const rects = boxes.map(([bx, by, bw, bh]) => ({
        x: bx * scale + ox,
        y: by * scale + oy,
        w: bw * scale,
        h: bh * scale,
      }));
      stateRef.current = { rects, cW, cH };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [boxes, imageWidth, imageHeight]);

  useEffect(() => {
    const off = document.createElement("canvas");
    let raf: number;
    const DURATION = 3000;
    const origin = performance.now();
    const N = 200;

    const tick = (now: number) => {
      const s = stateRef.current;
      const canvas = canvasRef.current;
      if (!s || !canvas || s.rects.length === 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const { rects, cW, cH } = s;
      if (off.width !== cW || off.height !== cH) {
        off.width = cW;
        off.height = cH;
      }

      const offCtx = off.getContext("2d")!;
      const ctx = canvas.getContext("2d")!;
      const headT = ((now - origin) % DURATION) / DURATION;

      offCtx.clearRect(0, 0, cW, cH);
      for (const rect of rects) {
        drawGlowBorder(offCtx, rect, headT, N);
      }

      ctx.clearRect(0, 0, cW, cH);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, cW, cH);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "black";
      for (const { x, y, w, h } of rects) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 3);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      ctx.filter = "blur(32px)"; ctx.globalAlpha = 0.5; ctx.drawImage(off, 0, 0);
      ctx.filter = "blur(12px)"; ctx.globalAlpha = 0.75; ctx.drawImage(off, 0, 0);
      ctx.filter = "none"; ctx.globalAlpha = 1; ctx.drawImage(off, 0, 0);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-10">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PhotoCard                                                                   */
/* -------------------------------------------------------------------------- */

type PhotoCardProps = {
  src?: string;
  quote?: string;
  attribution?: string;
  className?: string;
  compact?: boolean;
  messageAudioUrl?: string | null;
  highlights?: {
    bbox: [number, number, number, number];
    imageWidth: number;
    imageHeight: number;
  }[];
};

export default function PhotoCard({
  src = "/dashboard/photo-1.png",
  quote = "",
  attribution = "",
  className = "",
  messageAudioUrl,
  highlights = [],
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

        {highlights.length > 0 && (
          <PeopleBoxHighlight
            boxes={highlights.map((h) => h.bbox)}
            imageWidth={highlights[0].imageWidth}
            imageHeight={highlights[0].imageHeight}
          />
        )}

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
              className="absolute bottom-2 right-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
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
