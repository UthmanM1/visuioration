import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid-paper flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Logo />
      <div className="flex flex-1 items-center">
        <div className="max-w-lg">
          <p className="tnum font-display text-7xl font-semibold tracking-[-0.04em] text-petrol-600">404</p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">This page isn&apos;t in the dataset.</h1>
          <p className="mt-3 text-ink-muted">The link may be out of date, or the page was only available in an earlier demo session.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/">Go to homepage</ButtonLink>
            <ButtonLink href="/app" variant="secondary">Open the demo workspace</ButtonLink>
          </div>
          <p className="mt-8 text-sm text-ink-muted">Looking for something specific? Try <Link href="/resources" className="underline underline-offset-4">resources</Link> or the <Link href="/case-study" className="underline underline-offset-4">case study</Link>.</p>
        </div>
      </div>
    </main>
  );
}
