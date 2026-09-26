"use client";

import { useEffect, useState } from "react";

export function Greeting() {
  const [text, setText] = useState("Good morning, Alex");
  useEffect(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    let name = "Alex";
    try {
      const saved = JSON.parse(window.localStorage.getItem("visuioration.onboarding") ?? "{}");
      if (saved.name) name = String(saved.name).split(" ")[0];
    } catch {
      /* default name */
    }
    setText(`${part}, ${name}`);
  }, []);
  return <>{text}</>;
}
