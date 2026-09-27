"use client";

import { useAppSession } from "@/components/app/session-context";
import { useClientValue } from "@/components/ui/use-client-value";

export function Greeting() {
  const session = useAppSession();
  const liveName = session.mode === "live" ? session.user.name.split(" ")[0] : null;
  // Local time and the demo's saved name exist only in the browser.
  const text = useClientValue(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    let name = liveName ?? "Alex";
    if (!liveName) {
      try {
        const saved = JSON.parse(window.localStorage.getItem("visuioration.onboarding") ?? "{}");
        if (saved.name) name = String(saved.name).split(" ")[0];
      } catch {
        /* default name */
      }
    }
    return `${part}, ${name}`;
  }, `Good morning, ${liveName ?? "Alex"}`);
  return <>{text}</>;
}
