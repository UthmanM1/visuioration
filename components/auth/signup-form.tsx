"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    if (!name) {
      setError("Enter your name so we can greet you in the workspace.");
      return;
    }
    setLoading(true);
    try {
      window.localStorage.setItem("visuioration.onboarding", JSON.stringify({ name }));
    } catch {
      /* storage unavailable: onboarding still works without persistence */
    }
    router.push("/onboarding");
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Your name" htmlFor="signup-name" error={error ?? undefined}>
        <Input id="signup-name" name="name" autoComplete="name" placeholder="Alex Morgan" aria-invalid={!!error} aria-describedby={error ? "signup-name-error" : undefined} />
      </Field>
      <Field label="Work email" htmlFor="signup-email" hint="Optional in the demo. Not stored or sent.">
        <Input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>Continue</Button>
    </form>
  );
}
