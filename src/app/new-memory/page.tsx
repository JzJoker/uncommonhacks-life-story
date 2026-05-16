import { Dropdown } from "@/components/Dropdown";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/Input";
import { RecordButton } from "@/components/RecordButton";

export const metadata = {
  title: "New Memory · LifeStory",
};

const CATEGORY_OPTIONS = [
  { value: "family", label: "Family & Important People" },
  { value: "places", label: "Places" },
  { value: "events", label: "Events" },
  { value: "everyday", label: "Everyday Life" },
];

export default function NewMemoryPage() {
  return (
    <div className="min-h-svh flex-1 bg-cream-25 px-6 py-8">
      <div className="mx-auto w-full max-w-[354px] flex flex-col gap-6">
        <h1 className="font-hand text-[24px] leading-none text-ink">
          New Memory
        </h1>

        <ImageUpload name="photo" />

        <form className="flex flex-col gap-4">
          <Field label="Category" htmlFor="category">
            <Dropdown
              id="category"
              name="category"
              options={CATEGORY_OPTIONS}
              defaultValue="family"
            />
          </Field>

          <Field label="Username" htmlFor="username">
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="John Doe"
            />
          </Field>

          <Field label="Comment" htmlFor="comment">
            <Input
              id="comment"
              name="comment"
              placeholder="John Doe"
            />
          </Field>

          <RecordButton />
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label
        htmlFor={htmlFor}
        className="text-base font-light text-muted leading-none"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
