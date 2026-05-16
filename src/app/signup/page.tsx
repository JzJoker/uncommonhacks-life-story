import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export const metadata = {
  title: "Sign Up · LifeStory",
};

export default function SignUpPage() {
  return (
    <div className="min-h-svh flex-1 bg-cream-50 px-16 py-16 flex items-center justify-center">
      <div className="w-[420px] max-w-full bg-paper border border-cream-50 rounded-[12px] p-6 flex flex-col gap-5">
        <header className="flex flex-col gap-2 text-ink">
          <h1 className="font-hand text-[28px] leading-none">Sign Up</h1>
          <p className="text-base font-light">Welcome to Lifestory</p>
        </header>

        <Button variant="primary" className="w-full">
          Sign in with Google
        </Button>

        <Divider label="Or" />

        <form className="flex flex-col gap-5">
          <div className="flex gap-3">
            <Field label="First Name" htmlFor="firstName">
              <Input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                placeholder="John"
              />
            </Field>
            <Field label="Last Name" htmlFor="lastName">
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                placeholder="Doe"
              />
            </Field>
          </div>

          <Field label="Username" htmlFor="username">
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="johndoe"
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </Field>

          <Button variant="default" type="submit" className="w-full">
            Sign In
          </Button>
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
    <div className="flex flex-1 min-w-0 flex-col gap-2">
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

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-px bg-cream-100" />
      <span className="text-base text-cream-100 leading-none">{label}</span>
      <div className="flex-1 h-px bg-cream-100" />
    </div>
  );
}
