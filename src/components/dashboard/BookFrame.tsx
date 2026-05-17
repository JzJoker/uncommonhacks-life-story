"use client";

import Image from "next/image";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

export type CoverImage = {
  url: string;
  bbox: [number, number, number, number] | null;
  imageWidth: number | null;
  imageHeight: number | null;
};

const PLACEHOLDER: CoverImage = { url: "/dashboard/photo-1.png", bbox: null, imageWidth: null, imageHeight: null };

const FLY_DURATION_MS = 450;
const FLY_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

type BookFrameProps = {
  className?: string;
  title?: string;
  dateRange?: string;
  coverImages?: CoverImage[];
};

function centerTransform(rect: DOMRect) {
  const x = (window.innerWidth - rect.width) / 2;
  const y = (window.innerHeight - rect.height) / 2;
  return `translate(${x}px, ${y}px)`;
}

export default function BookFrame({
  className = "",
  title = "Early Childhood",
  dateRange = "1999-2007",
  coverImages = [PLACEHOLDER],
}: BookFrameProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [flyStyle, setFlyStyle] = useState<CSSProperties | null>(null);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanPortal(true);
  }, []);

  const startFlyFrom = useCallback((rect: DOMRect) => {
    setFlyStyle({
      position: "fixed",
      top: 0,
      left: 0,
      width: rect.width,
      height: rect.height,
      transform: `translate(${rect.left}px, ${rect.top}px)`,
      zIndex: 50,
      transition: "none",
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyStyle({
          position: "fixed",
          top: 0,
          left: 0,
          width: rect.width,
          height: rect.height,
          transform: centerTransform(rect),
          zIndex: 50,
          transition: `transform ${FLY_DURATION_MS}ms ${FLY_EASING}`,
        });
      });
    });
  }, []);

  const expand = useCallback(() => {
    const bookEl = bookRef.current;
    if (!bookEl) return;

    const rect = bookEl.getBoundingClientRect();

    setIsCollapsing(false);
    startFlyFrom(rect);
    setShowBackdrop(true);
    setIsExpanded(true);
  }, [startFlyFrom]);

  const collapse = useCallback(() => {
    const placeholder = placeholderRef.current;
    if (!placeholder) return;

    const rect = placeholder.getBoundingClientRect();
    setIsCollapsing(true);

    setFlyStyle((prev) => ({
      ...(prev ?? {}),
      transform: `translate(${rect.left}px, ${rect.top}px)`,
      transition: `transform ${FLY_DURATION_MS}ms ${FLY_EASING}`,
    }));
  }, []);

  const toggle = useCallback(() => {
    if (isExpanded && !isCollapsing) {
      collapse();
    } else if (!isExpanded) {
      expand();
    }
  }, [collapse, expand, isCollapsing, isExpanded]);

  const showExpandedUI = isExpanded && !isCollapsing;
  const isFlying = flyStyle !== null;

  const onFlyTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.propertyName !== "transform" || !isCollapsing) return;

      setIsExpanded(false);
      setIsCollapsing(false);
      setShowBackdrop(false);
      setFlyStyle(null);
    },
    [isCollapsing],
  );

  const shell = (
    <div
      ref={shellRef}
      style={flyStyle ?? undefined}
      className={isFlying ? "relative" : "relative"}
      onTransitionEnd={onFlyTransitionEnd}
      onClick={isFlying ? toggle : undefined}
      onKeyDown={
        isFlying
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            }
          : undefined
      }
      role={isFlying ? "button" : undefined}
      tabIndex={isFlying ? 0 : undefined}
    >
      {isFlying ? (
        <>
          {(isExpanded || isCollapsing) && (
            <p
              className={`absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 text-center font-hand text-3xl whitespace-nowrap text-ink transition-opacity ease-out ${
                showExpandedUI
                  ? "opacity-100 duration-200"
                  : `pointer-events-none opacity-0 ${isCollapsing ? "duration-0" : "duration-75"}`
              }`}
            >
              {title}
            </p>
          )}
          <BookCover ref={bookRef} coverImages={coverImages} />
          {(isExpanded || isCollapsing) && (
            <div
              className={`absolute top-full right-0 left-0 pt-12 transition-opacity ease-out ${
                showExpandedUI
                  ? "opacity-100 duration-200"
                  : `pointer-events-none opacity-0 ${isCollapsing ? "duration-0" : "duration-75"}`
              }`}
            >
              <Button
                href="/individual"
                className="w-full"
                text="View Album"
                variant="primary"
              />
            </div>
          )}
        </>
      ) : (
        <BookCover ref={bookRef} coverImages={coverImages} />
      )}
    </div>
  );

  return (
    <article
      className={`group flex w-[338px] shrink-0 flex-col items-start justify-center gap-8 ${className}`.trim()}
    >
      <div
        className="relative h-[507px] w-[338px]"
        onClick={!isFlying ? toggle : undefined}
        onKeyDown={
          !isFlying
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }
            : undefined
        }
        role={!isFlying ? "button" : undefined}
        tabIndex={!isFlying ? 0 : undefined}
        aria-expanded={isExpanded}
      >
        {isExpanded && (
          <div
            ref={placeholderRef}
            className="invisible h-full w-full"
            aria-hidden
          />
        )}

        {isFlying
          ? canPortal
            ? createPortal(shell, document.body)
            : shell
          : shell}
      </div>

      {showBackdrop &&
        canPortal &&
        createPortal(
          <button
            type="button"
            aria-label="Close album"
            className={`fixed inset-0 z-40 bg-white/80 backdrop-blur-sm transition-opacity duration-500 ${
              isCollapsing ? "opacity-0" : "opacity-100"
            }`}
            onClick={collapse}
          />,
          document.body,
        )}

      <div className="flex w-full flex-col items-start">
        <div className="flex flex-col items-start gap-[7px] whitespace-nowrap">
          <h2 className="font-hand text-2xl font-light text-ink">{title}</h2>
          <p className="text-xs text-muted">{dateRange}</p>
        </div>
      </div>
    </article>
  );
}

function CroppedPhoto({ image }: { image: CoverImage }) {
  const { url, bbox, imageWidth: iW, imageHeight: iH } = image;

  if (!bbox || !iW || !iH) {
    return <Image src={url} alt="" fill className="object-cover" sizes="200px" unoptimized />;
  }

  const [bx, by, bw, bh] = bbox;

  // Pad 30% around the bbox for context
  const padX = bw * 0.3;
  const padY = bh * 0.3;
  const rx = Math.max(0, bx - padX);
  const ry = Math.max(0, by - padY);
  const rw = Math.min(iW - rx, bw + 2 * padX);
  const rh = Math.min(iH - ry, bh + 2 * padY);

  // Cover: scale so the shorter bbox dimension fills the square container
  const minSide = Math.min(rw, rh);

  // background-size as % of container (square, so same base for both axes)
  const bgSizeX = (iW / minSide) * 100;
  const bgSizeY = (iH / minSide) * 100;

  // CSS background-position %: position = (container - bgSize) * pct/100
  // Derive pct from desired pixel offset so the region is centered.
  const xNum = -rx + (minSide - rw) / 2;
  const xDen = minSide - iW;
  const bgX = xDen !== 0 ? (xNum / xDen) * 100 : 50;

  const yNum = -ry + (minSide - rh) / 2;
  const yDen = minSide - iH;
  const bgY = yDen !== 0 ? (yNum / yDen) * 100 : 50;

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${url})`,
        backgroundSize: `${bgSizeX.toFixed(3)}% ${bgSizeY.toFixed(3)}%`,
        backgroundPosition: `${bgX.toFixed(3)}% ${bgY.toFixed(3)}%`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

const BookCover = forwardRef<HTMLDivElement, { coverImages: CoverImage[] }>(
  function BookCover({ coverImages }, ref) {
    const img = (i: number) => coverImages[i] ?? coverImages[0] ?? PLACEHOLDER;
    return (
      <div
        ref={ref}
        className="relative flex-none -skew-x-1 cursor-pointer transition-transform duration-300 group-hover:scale-98 active:scale-95"
      >
        <div className="relative z-10 z-40 flex h-[507px] w-full items-start overflow-hidden rounded-r-3xl bg-gray-200">
          <div className="relative z-30 h-full w-10 bg-black/10">
            <div className="pointer-events-none absolute inset-0 flex justify-between">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-full w-px bg-white/10" />
              ))}
            </div>
          </div>
          <div className="relative grid h-full w-full place-items-center p-12 group-hover:scale-95">
            <div className="absolute top-1/2 left-1/2 z-1 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300">
              <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                <CroppedPhoto image={img(0)} />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 z-3 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300 group-hover:-translate-x-[calc(50%-24px)] group-hover:rotate-4">
              <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                <CroppedPhoto image={img(1)} />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300 group-hover:-translate-x-[calc(50%+24px)] group-hover:-rotate-4">
              <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                <CroppedPhoto image={img(2)} />
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
    );
  },
);

BookCover.displayName = "BookCover";
