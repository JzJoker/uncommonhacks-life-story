"use client";

import { useEffect, useRef, useState } from "react";

type BlurRevealProps = {
  text: string;
  /** ms between each word/letter starting its animation */
  delay?: number;
  /** total ms per element from blurred → sharp */
  duration?: number;
  /** travel direction the element enters from */
  direction?: "top" | "bottom";
  /** word-level or letter-level stagger */
  animateBy?: "words" | "letters";
  className?: string;
  as?: "p" | "h1" | "h2" | "h3" | "span";
};

export function BlurReveal({
  text,
  delay = 120,
  duration = 500,
  direction = "bottom",
  animateBy = "words",
  className = "",
  as: Tag = "p",
}: BlurRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const segments = animateBy === "words" ? text.split(" ") : Array.from(text);
  const offset = direction === "top" ? -50 : 50;

  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
      className={`flex flex-wrap ${className}`}
    >
      {segments.map((segment, i) => {
        const isLastWord = animateBy === "words" && i < segments.length - 1;
        const style: React.CSSProperties = {
          display: "inline-block",
          willChange: "transform, filter, opacity",
          transition: `filter ${duration}ms ease-out, opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
          transitionDelay: `${i * delay}ms`,
          filter: inView ? "blur(0px)" : "blur(10px)",
          opacity: inView ? 1 : 0,
        };
        return (
          <span key={i} style={style}>
            {segment === " " ? " " : segment}
            {isLastWord && " "}
          </span>
        );
      })}
    </Tag>
  );
}

export default BlurReveal;
