import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Temporarily unavailable", robots: { index: false, follow: false } };

/** Shown (with HTTP 503) when a production build has no database configured and demo mode isn't enabled. */
export default function UnavailablePage() {
  return (
    <main id="main" className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Logo />
      <div className="flex flex-1 items-center">
        <div className="max-w-lg">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">The workspace is temporarily unavailable</h1>
          <p className="mt-3 text-ink-muted">This deployment isn&apos;t connected to its database yet. Please try again later.</p>
          <p className="mt-6 text-[13px] text-ink-faint">For administrators: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or set NEXT_PUBLIC_DEMO_MODE=true to run the sample-data demo on purpose.</p>
        </div>
      </div>
    </main>
  );
}
