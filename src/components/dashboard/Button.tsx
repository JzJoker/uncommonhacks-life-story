"use client";

import Link from "next/link";

const variants = {
  default:
    "border-stroke bg-paper text-ink hover:border-cream-100 hover:bg-cream-50 active:border-cream-100 ",
  primary:
    "border-ink bg-ink text-primary-fg hover:bg-ink/90 active:bg-ink/80 active:border-ink/80",
} as const;

const baseClass =
  "flex shrink-0 cursor-pointer items-center justify-center rounded border px-4 py-3 text-base transition-[background-color,border-color,transform,color] duration-150 ease-out active:scale-[0.98]";

type ButtonVariant = keyof typeof variants;

type ButtonProps = {
  className?: string;
  text?: string;
  variant?: ButtonVariant;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export default function Button({
  className = "",
  text = "Button",
  variant = "default",
  href,
  onClick,
  disabled = false,
}: ButtonProps) {
  const classes = `${baseClass} ${variants[variant]} ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
        aria-disabled={disabled}
      >
        {text}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}
