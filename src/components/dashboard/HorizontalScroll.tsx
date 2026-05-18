"use client";

import { useEffect, useRef, type ReactNode } from "react";

type HorizontalScrollProps = {
  className?: string;
  viewportClassName?: string;
  header?: ReactNode;
  children: ReactNode;
};

export default function HorizontalScroll({
  className = "",
  viewportClassName = "",
  header,
  children,
}: HorizontalScrollProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    if (!root || !viewport) return;

    const onWheel = (e: WheelEvent) => {
      const { deltaX, deltaY } = e;
      const delta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;

      if (delta === 0) return;
      if (viewport.scrollWidth <= viewport.clientWidth) return;

      e.preventDefault();
      viewport.scrollLeft += delta;
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {header}
      <div ref={viewportRef} className={viewportClassName}>
        {children}
      </div>
    </div>
  );
}
