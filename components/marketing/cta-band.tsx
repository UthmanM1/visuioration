import { ButtonLink } from "@/components/ui/button";

export function CtaBand({ title = "See your data the way decisions get made.", body = "Open the Northstar demo workspace. No sign-up, no real data, every workflow working." }: { title?: string; body?: string }) {
  return (
    <section className="bg-paper py-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[22px] bg-night px-6 py-14 sm:px-12">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-60 md:block" aria-hidden>
            <svg viewBox="0 0 400 240" className="h-full w-full" preserveAspectRatio="none">
              {[40, 64, 52, 88, 76, 110, 98, 132, 150, 170].map((h, i) => (
                <rect key={i} x={20 + i * 38} y={240 - h} width="22" height={h} rx="3" fill={i === 9 ? "#C98A1B" : "#1F3A3E"} />
              ))}
            </svg>
          </div>
          <div className="relative max-w-xl">
            <h2 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[2.5rem]">{title}</h2>
            <p className="mt-4 text-white/70">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" variant="light" size="lg">Start exploring</ButtonLink>
              <ButtonLink href="/app" variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">View demo</ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
