"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type Errors = Partial<Record<"name" | "email" | "company" | "message", string>>;

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Errors = {};
    if (!String(data.get("name")).trim()) next.name = "Enter your name.";
    const email = String(data.get("email")).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid work email, like name@company.com.";
    if (!String(data.get("company")).trim()) next.company = "Enter your company name.";
    if (String(data.get("message")).trim().length < 10) next.message = "Tell us a little more (at least 10 characters).";
    setErrors(next);
    if (Object.keys(next).length) return;
    setState("sending");
    await new Promise((r) => setTimeout(r, 900));
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="rounded-panel border border-line bg-surface p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-petrol-600" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">Message received</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-muted">This is a demo, so no email was sent. In production, your request would reach the team and you would hear back within one business day.</p>
        <Button variant="secondary" className="mt-6" onClick={() => setState("idle")}>Send another message</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-panel border border-line bg-surface p-6 sm:grid-cols-2 sm:p-8 grid-cols-1">
      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
      </Field>
      <Field label="Work email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
      </Field>
      <Field label="Company" htmlFor="company" error={errors.company}>
        <Input id="company" name="company" autoComplete="organization" aria-invalid={!!errors.company} aria-describedby={errors.company ? "company-error" : undefined} />
      </Field>
      <Field label="Role" htmlFor="role">
        <Select id="role" name="role" defaultValue="Analyst">
          {["Executive", "Analyst", "Marketing", "Operations", "Consultant", "Other"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
      <Field label="What would you like to explore?" htmlFor="message" error={errors.message} className="sm:col-span-2">
        <Textarea id="message" name="message" placeholder="For example: a monthly regional performance report for our leadership team" aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} />
      </Field>
      <Field label="Budget" htmlFor="budget" hint="An estimate is fine." className="sm:col-span-2">
        <Select id="budget" name="budget" defaultValue="Not sure yet">
          {["Not sure yet", "Under $5,000 / year", "$5,000 – $25,000 / year", "$25,000 – $100,000 / year", "Over $100,000 / year"].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-ink-faint">Demo form. Nothing you type leaves your browser.</p>
        <Button type="submit" loading={state === "sending"}>Send message</Button>
      </div>
    </form>
  );
}
