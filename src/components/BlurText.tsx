"use client";

import { useEffect, useRef, useState } from "react";

type BlurTextProps = {
  children: string;
  /** Total time (ms) the blur stays applied before fading back to sharp. */
  hold?: number;
  /** Max blur radius (px). */
  amount?: number;
  className?: string;
};

export function BlurText({
  children,
  hold = 180,
  amount = 4,
  className = "",
}: BlurTextProps) {
  const [blurred, setBlurred] = useState(false);
  const prevRef = useRef(children);

  useEffect(() => {
    if (prevRef.current === children) return;
    prevRef.current = children;
    setBlurred(true);
    const t = setTimeout(() => setBlurred(false), hold);
    return () => clearTimeout(t);
  }, [children, hold]);

  return (
    <span
      className={`inline-block transition-[filter] duration-200 ease-out ${className}`}
      style={{ filter: blurred ? `blur(${amount}px)` : "blur(0)" }}
    >
      {children}
    </span>
  );
}

export default BlurText;
