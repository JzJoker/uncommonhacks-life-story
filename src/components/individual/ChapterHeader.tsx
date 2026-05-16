import Button from "@/components/dashboard/Button";

type ChapterHeaderProps = {
  title?: string;
};

export default function ChapterHeader({
  title = "Early Childhood",
}: ChapterHeaderProps) {
  return (
    <header className="relative flex shrink-0 items-start bg-primary-fg px-6 py-4">
      <Button href="/dashboard" text="Exit Album" />
      <h1 className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 font-hand text-[28px] leading-normal whitespace-nowrap text-ink">
        {title}
      </h1>
    </header>
  );
}
