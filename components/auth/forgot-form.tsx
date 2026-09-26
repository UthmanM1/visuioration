"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setSent(email);
    setLoading(false);
  }
  if (sent) {
    return (
      <div role="status" className="rounded-panel border border-line bg-surface p-5">
        <MailCheck className="h-6 w-6 text-petrol-600" aria-hidden />
        <p className="mt-3 font-semibold">Check your inbox</p>
        <p className="mt-1 text-sm text-ink-muted">In production, a reset link would go to <span className="break-all font-medium text-ink">{sent}</span>. In the demo, nothing was sent.</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="forgot-email" error={error ?? undefined}>
        <Input id="forgot-email" name="email" type="email" autoComplete="email" aria-invalid={!!error} aria-describedby={error ? "forgot-email-error" : undefined} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
    </form>
  );
}
