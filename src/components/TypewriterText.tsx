"use client";

import { useEffect, useState } from "react";

type TypewriterTextProps = {
  children: string;
  /** ms per character */
  speed?: number;
  className?: string;
};

export function TypewriterText({ children, speed = 26, className = "" }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState(children);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setTyping(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(children.slice(0, i));
      if (i >= children.length) {
        clearInterval(id);
        setTyping(false);
      }
    }, speed);
    return () => clearInterval(id);
  }, [children, speed]);

  return (
    <span className={className}>
      {displayed}
      {typing && (
        <span
          className="inline-block w-[1.5px] bg-current ml-[1px] align-middle animate-pulse"
          style={{ height: "0.85em" }}
          aria-hidden
        />
      )}
    </span>
  );
}

export default TypewriterText;
