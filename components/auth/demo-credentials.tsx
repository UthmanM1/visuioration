import { DEMO_CREDENTIALS } from "@/lib/services/auth";

export function DemoCredentials() {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-100/50 px-4 py-3 text-[13px]">
      <p className="font-semibold text-amber-700">Demo account</p>
      <dl className="mt-1 grid grid-cols-[70px_1fr] gap-y-0.5 text-ink-soft">
        <dt>Email</dt>
        <dd className="break-all font-medium">{DEMO_CREDENTIALS.email}</dd>
        <dt>Password</dt>
        <dd className="font-medium">{DEMO_CREDENTIALS.password}</dd>
      </dl>
    </div>
  );
}
