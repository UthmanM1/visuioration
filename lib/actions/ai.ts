"use server";

import { answerQuestion } from "../ai/pipeline";
import { ServiceError } from "../services/errors";
import { requireSession } from "../services/session";
import { appMode } from "../supabase/config";
import { runAction } from "./helpers";

export async function askAiAction(input: { question: string }) {
  return runAction(async () => {
    if (appMode !== "live") throw new ServiceError("AI answers need a connected database.", "forbidden");
    const session = await requireSession();
    return answerQuestion(session, String(input.question ?? ""));
  });
}
