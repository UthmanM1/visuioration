"use server";

import { redirect } from "next/navigation";
import { authServerService } from "../services/auth-server";
import { ServiceError } from "../services/errors";
import { appMode } from "../supabase/config";
import { requireEmail, requirePassword, requireText, runAction, safeNext } from "./helpers";

function assertLive() {
  if (appMode !== "live") throw new Error("Authentication is not configured.");
}

export async function signInAction(input: { email: string; password: string; next?: string }) {
  assertLive();
  return runAction(async () => {
    const email = requireEmail(input.email);
    if (!input.password) throw new ServiceError("Enter your password.", "validation");
    await authServerService.signIn(email, input.password);
    return { next: safeNext(input.next) };
  });
}

export async function signUpAction(input: { name: string; email: string; password: string }) {
  assertLive();
  return runAction(async () => {
    const name = requireText(input.name, "Your name", { max: 120 });
    const email = requireEmail(input.email);
    const password = requirePassword(input.password);
    return authServerService.signUp({ name, email, password });
  });
}

export async function requestPasswordResetAction(input: { email: string }) {
  assertLive();
  return runAction(async () => {
    await authServerService.sendPasswordReset(requireEmail(input.email));
  });
}

export async function updatePasswordAction(input: { password: string }) {
  assertLive();
  return runAction(async () => {
    await authServerService.updatePassword(requirePassword(input.password));
  });
}

export async function signOutAction() {
  if (appMode === "live") await authServerService.signOut();
  redirect(appMode === "live" ? "/login" : "/");
}
