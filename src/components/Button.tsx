import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "primary";
type ButtonSize = "base" | "sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const sizeStyles: Record<ButtonSize, string> = {
  base: "px-4 py-3 text-base",
  sm: "px-3 py-2 text-xs",
};

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-paper border-stroke text-ink hover:bg-cream-50",
  primary: "bg-ink border-ink text-[var(--color-primary-fg)] hover:opacity-90",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className = "", variant = "default", size = "base", type = "button", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        {...props}
        className={[
          "inline-flex items-center justify-center rounded-[4px] border",
          "font-normal leading-none transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
          "disabled:opacity-50 disabled:pointer-events-none",
          sizeStyles[size],
          variantStyles[variant],
          className,
        ].join(" ")}
      />
    );
  }
);

export default Button;
