"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signInAction } from "@/lib/actions/auth";
import { authService, DEMO_CREDENTIALS } from "@/lib/services/auth";

export function LoginForm({ live = false, next = "/app" }: { live?: boolean; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setLoading(true);
    try {
      if (live) {
        const result = await signInAction({ email: String(data.get("email")), password: String(data.get("password")), next });
        if (!result.ok) throw new Error(result.error);
        router.replace(result.data.next);
        router.refresh();
        return;
      }
      await authService.signIn(String(data.get("email")), String(data.get("password")));
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="login-email">
        <Input id="login-email" name="email" type="email" autoComplete="email" defaultValue={live ? undefined : DEMO_CREDENTIALS.email} aria-invalid={!!error} />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <Input id="login-password" name="password" type="password" autoComplete="current-password" defaultValue={live ? undefined : DEMO_CREDENTIALS.password} aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined} />
      </Field>
      {error ? (
        <p id="login-error" role="alert" className="rounded-md bg-rust-100 px-3 py-2 text-[13px] text-rust-700">{error}</p>
      ) : null}
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline">Forgot password?</Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>Log in</Button>
    </form>
  );
}
