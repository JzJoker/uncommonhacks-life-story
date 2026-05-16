import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

type DropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
};

export const Dropdown = forwardRef<HTMLSelectElement, DropdownProps>(
  function Dropdown({ className = "", options, ...props }, ref) {
    return (
      <div
        className={[
          "relative flex items-center w-full",
          "bg-paper border border-[#efefef] rounded-[4px] overflow-hidden",
          className,
        ].join(" ")}
      >
        <select
          ref={ref}
          {...props}
          className={[
            "appearance-none w-full bg-transparent",
            "px-3 py-3 pr-14 text-base font-light text-ink",
            "focus:outline-none",
          ].join(" ")}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div
          aria-hidden
          className={[
            "absolute right-0 top-0 bottom-0",
            "flex items-center justify-center px-2",
            "bg-[#f1f1f1] border-l border-[#efefef]",
            "pointer-events-none text-ink",
          ].join(" ")}
        >
          <ChevronDown size={16} strokeWidth={1.5} />
        </div>
      </div>
    );
  }
);

export default Dropdown;
