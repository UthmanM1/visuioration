"use client";

import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center" role="alert">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust-100 text-rust-700"><AlertTriangle className="h-6 w-6" aria-hidden /></span>
      <h1 className="mt-5 text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">Your demo dataset could not be loaded. Try again, or return to the dashboard.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/app" variant="secondary">Return to dashboard</ButtonLink>
      </div>
    </div>
  );
}
