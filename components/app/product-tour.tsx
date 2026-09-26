"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const steps = [
  { target: "workspace", title: "Your workspace", body: "The dashboard shows how Northstar Retail Group is performing, with comparisons to the previous period." },
  { target: "projects", title: "Your projects", body: "Projects group the datasets, charts and reports for one piece of analysis." },
  { target: "data", title: "Your data", body: "Datasets are profiled on import so you can check quality before building on them." },
  { target: "visualizations", title: "Your visualizations", body: "Build charts from dimensions and measures, then add them to dashboards and reports." },
  { target: "insights", title: "AI insights", body: "Ask what changed and get an explanation with the evidence behind it. Answers are simulated from demo data." },
  { target: "reports", title: "Reports", body: "Turn analysis into an executive report and share it as a clean link." },
];

const STORAGE_KEY = "visuioration.tour-done";

export function ProductTour() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY) && window.matchMedia("(min-width: 1024px)").matches) {
        const t = window.setTimeout(() => setStep(0), 700);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* storage unavailable: skip tour */
    }
  }, []);

  useEffect(() => {
    if (step === null) return;
    const el = document.querySelector(`[data-tour="${steps[step].target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  function finish() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setStep(null);
  }

  if (step === null) return null;
  const current = steps[step];
  const last = step === steps.length - 1;
  return (
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="false" aria-labelledby="tour-title">
      <div className="absolute inset-0 bg-night/25" aria-hidden onClick={finish} />
      {rect ? <div className="pointer-events-none absolute rounded-lg ring-2 ring-petrol-500 ring-offset-2 ring-offset-paper transition-all duration-200" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden /> : null}
      <div className="absolute w-[320px] animate-rise rounded-xl bg-night p-5 text-white shadow-overlay" style={{ top: Math.max(16, (rect?.top ?? 120) - 12), left: (rect?.right ?? 240) + 20 }}>
        <p className="tnum text-[12px] text-white/50">Step {step + 1} of {steps.length}</p>
        <h2 id="tour-title" className="mt-1 text-[15px] font-semibold">{current.title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">{current.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-[13px] text-white/60 hover:text-white">Skip tour</button>
          <Button variant="light" size="sm" onClick={() => (last ? finish() : setStep(step + 1))} autoFocus>
            {last ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
