import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={[
          "w-full rounded-[4px] border border-cream-50 bg-paper",
          "px-4 py-3 text-base font-light text-ink",
          "placeholder:text-cream-100 placeholder:font-light",
          "focus:outline-none focus:border-ink/40",
          "transition-colors",
          className,
        ].join(" ")}
      />
    );
  }
);

export default Input;
