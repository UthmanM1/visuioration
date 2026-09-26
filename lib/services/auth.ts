import { currentUser } from "../demo-data";
import { demoResolve, DemoServiceError } from "./client";

export const DEMO_CREDENTIALS = { email: "demo@visuioration.example", password: "demo" };

/**
 * Demo-only authentication. There are no sessions, tokens or password hashing here.
 * Production: replace with an auth provider (Auth.js, Clerk, Supabase Auth, WorkOS)
 * and protect /app routes with middleware.
 */
export const authService = {
  signIn: async (email: string, password: string) => {
    if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
      await demoResolve(null, 500);
      throw new DemoServiceError("Use the demo credentials shown on this page, or continue with the demo workspace.");
    }
    return demoResolve(currentUser, 500);
  },
  continueAsDemo: () => demoResolve(currentUser, 300),
};
