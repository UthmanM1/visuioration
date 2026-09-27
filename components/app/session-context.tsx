"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AppSession } from "@/lib/session-types";

const SessionContext = createContext<AppSession | null>(null);

export function SessionProvider({ session, children }: { session: AppSession; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** The signed-in user and active workspace, provided by the /app layout. */
export function useAppSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useAppSession must be used inside the /app layout.");
  return session;
}
