import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Logo } from "@/components/Logo";
import { PhotoCard } from "@/components/PhotoCard";

export default function Home() {
  return (
    <main className="flex-1 px-8 py-16">
      <div className="mx-auto max-w-5xl flex flex-col gap-16">
        <header className="flex items-center gap-3">
          <Logo />
          <span className="text-xl font-light tracking-wide">LifeStory</span>
        </header>

        <Section title="Logo">
          <div className="flex items-center gap-6">
            <Logo size={24} />
            <Logo size={32} />
            <Logo size={48} />
          </div>
        </Section>

        <Section title="Input">
          <div className="max-w-[354px]">
            <Input placeholder="Placeholder" />
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap items-start gap-4">
            <Button variant="default">Button</Button>
            <Button variant="primary">Button</Button>
            <Button variant="default" size="sm">
              Button
            </Button>
          </div>
        </Section>

        <Section title="Photo card">
          <PhotoCard
            photoSrc="/demo/photo.jpg"
            photoAlt="A person walking in a sunlit field at golden hour"
            quote="Me and grandma all around nature!!! :)"
            contributorName="Kolbe"
            contributorRelation="your son"
            contributorAvatarSrc="/demo/avatar.jpg"
            title="Time in Nature"
            recordedDate="March, 9th, 2009"
          />
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-muted">{title}</h2>
      <div className="rounded-md border border-white/5 bg-white/[0.02] p-8">
        {children}
      </div>
    </section>
  );
}
