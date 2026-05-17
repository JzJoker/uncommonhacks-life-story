import { Sparkle } from "lucide-react";
import { TypewriterText } from "@/components/TypewriterText";

type AgentPanelProps = {
  message: string;
  actions?: React.ReactNode;
  className?: string;
};

export function AgentPanel({
  message,
  actions,
  className = "",
}: AgentPanelProps) {
  return (
    <section
      aria-label="Narrator agent"
      className={["w-full flex z-80 flex-col gap-3", className].join(" ")}
    >
      <div className="flex items-center gap-2 text-lg  text-ink">
        <Sparkle size={16} fill="currentColor" />
        <span className="font-hand text-[24px]">Book Keeper</span>
      </div>
      <p className="font-sans font-light text-ink leading-snug text-base sm:text-lg">
        <TypewriterText>{message}</TypewriterText>
      </p>
      {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
    </section>
  );
}

export default AgentPanel;
