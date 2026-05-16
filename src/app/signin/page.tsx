import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function SignInPage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-cream-50 px-16 py-16">
      <div className="w-[420px] bg-paper border border-cream-50 rounded-[12px] p-6 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-2 text-ink">
          <h1 className="font-hand text-[28px] leading-none">Sign In</h1>
          <p className="text-base font-light leading-none">
            Welcome to Lifestory
          </p>
        </div>

        <Button variant="primary" className="w-full">
          Sign in with Google
        </Button>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-cream-100" />
          <span className="text-base text-cream-100">Or</span>
          <div className="flex-1 h-px bg-cream-100" />
        </div>

        <Field id="username" label="Username">
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="John Doe"
          />
        </Field>

        <Field id="password" label="Password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="John Doe"
          />
        </Field>

        <Button variant="default" className="w-full">
          Sign In
        </Button>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label
        htmlFor={id}
        className="text-base font-light text-muted leading-none"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
