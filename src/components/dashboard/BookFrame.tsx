"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import Button from "./Button";

const PHOTO_ONE = "/dashboard/photo-1.png";

const FLY_DURATION_MS = 450;
const FLY_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

type BookFrameProps = {
  className?: string;
  title?: string;
  dateRange?: string;
  coverImages?: string[];
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
  coverImages = [PHOTO_ONE],
}: BookFrameProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [flyStyle, setFlyStyle] = useState<CSSProperties | null>(null);
  const [showBackdrop, setShowBackdrop] = useState(false);

  const expand = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

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
    setIsExpanded(true);
    setIsCollapsing(false);
    setShowBackdrop(true);

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

  return (
    <article
      className={`group flex w-[338px] shrink-0 flex-col items-start justify-center gap-20 ${className}`.trim()}
    >
      <div
        className="relative h-[507px] w-[338px]"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        {isExpanded && (
          <div
            ref={placeholderRef}
            className="invisible h-full w-full"
            aria-hidden
          />
        )}

        <div
          ref={shellRef}
          style={flyStyle ?? undefined}
          className={isExpanded ? undefined : "relative"}
          onTransitionEnd={onFlyTransitionEnd}
        >
          <div className="flex flex-col gap-3">
            <p
              className={`text-center font-hand text-3xl text-ink transition-opacity ease-out ${
                showExpandedUI
                  ? "opacity-100 duration-200"
                  : `pointer-events-none opacity-0 ${isCollapsing ? "duration-0" : "duration-75"}`
              }`}
            >
              {title}
            </p>
            <BookCover coverImages={coverImages} />
            <div
              className={`pt-8 transition-opacity ease-out ${
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
          </div>
        </div>
      </div>
      {showBackdrop && (
        <button
          type="button"
          aria-label="Close album"
          className={`fixed inset-0 z-40 backdrop-blur-sm bg-white/80 transition-opacity duration-500 ${
            isCollapsing ? "opacity-0" : "opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            collapse();
          }}
        />
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

function BookCover({ coverImages }: { coverImages: string[] }) {
  return (
    <div className="relative flex-none -skew-x-1 cursor-pointer transition-transform duration-300 group-hover:scale-98 active:scale-95">
      <div className="relative z-10 z-40  flex h-[507px] w-full items-start overflow-hidden rounded-r-3xl bg-gray-200">
        <div className="relative z-30 h-full w-10 bg-black/10">
          <div className="pointer-events-none absolute inset-0 flex justify-between">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-full w-px bg-white/10" />
            ))}
          </div>
        </div>
        <div className="relative grid h-full w-full place-items-center p-12 group-hover:scale-95">
          <div className="absolute top-1/2 left-1/2 z-1 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300">
            <div className="relative aspect-square w-full bg-green-500">
              <Image
                src={coverImages[0]}
                alt=""
                fill
                className="object-cover"
                sizes="100%"
              />
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 z-3 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300 group-hover:-translate-x-[calc(50%-24px)] group-hover:rotate-4">
            <div className="relative aspect-square w-full bg-green-500">
              <Image
                src={coverImages[0]}
                alt=""
                fill
                className="object-cover"
                sizes="100%"
              />
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 bg-white p-3 pb-12 shadow-sm transition-transform duration-300 group-hover:-translate-x-[calc(50%+24px)] group-hover:-rotate-4">
            <div className="relative aspect-square w-full bg-green-500">
              <Image
                src={coverImages[0]}
                alt=""
                fill
                className="object-cover"
                sizes="100%"
              />
            </div>
          </div>
        </div>
      </div>
      <div>
        {/* <div className="pointer-events-none absolute top-0 right-0 z-50 flex h-full w-[24px] translate-x-[24px] justify-between">
          {Array.from({ length: 8 }, (_, i) => i).map((d) => (
            <div
              key={d}
              className="h-full w-px bg-linear-to-b from-transparent via-black/20 to-transparent"
              style={{ transform: `translateY(${d * 4}px)` }}
            />
          ))}
        </div> */}
        {Array.from({ length: 8 }, (_, i) => i + 1).map((d, i) => (
          <div
            key={d}
            className="absolute inset-0 rounded-r-3xl border-l-0  bg-white border border-black/20 "
            style={{
              transform: `translate(${i * 2}px, ${i * 2}px)`,
              zIndex: 24 - i,
            }}
          />
        ))}
      </div>
    </div>
  );
}
