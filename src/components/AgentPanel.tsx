import { Sparkle } from "lucide-react";
import { BlurText } from "@/components/BlurText";

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
      className={["w-full flex flex-col gap-3", className].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-ink">
        <Sparkle size={12} fill="currentColor" />
        <span>Agent Logic</span>
      </div>
      <p className="font-sans font-light text-ink leading-snug text-base sm:text-lg">
        <BlurText hold={220} amount={5}>
          {message}
        </BlurText>
      </p>
      {actions && (
        <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
      )}
    </section>
  );
}

export default AgentPanel;
