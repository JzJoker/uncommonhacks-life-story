import { Flower2 } from "lucide-react";

type LogoProps = {
  className?: string;
  size?: number;
};

export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <div
      className={`bg-ink text-paper inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="LifeStory logo"
    >
      <Flower2 size={Math.round(size * 0.75)} strokeWidth={1.75} />
    </div>
  );
}

export default Logo;
