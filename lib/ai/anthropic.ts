import "server-only";
import { ServiceError } from "../services/errors";
import { aiConfig } from "./config";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCallResult<T> {
  input: T;
  usage: { inputTokens: number; outputTokens: number };
}

type Message = { role: "user" | "assistant"; content: string };

/**
 * Calls the Claude Messages API and forces a single tool call, so the reply is structured JSON
 * (the tool input) rather than free text. No SDK dependency; plain fetch with a timeout.
 */
export async function callTool<T>(options: { system: string; messages: Message[]; tool: ToolDefinition; maxTokens?: number }): Promise<ToolCallResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiConfig.timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${aiConfig.baseUrl}/v1/messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": aiConfig.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        max_tokens: options.maxTokens ?? 1500,
        system: options.system,
        messages: options.messages,
        tools: [options.tool],
        tool_choice: { type: "tool", name: options.tool.name },
      }),
    });
  } catch (error) {
    console.error("[ai] request failed", error instanceof Error ? error.name : error);
    throw new ServiceError(controller.signal.aborted ? "The AI service took too long to respond. Please try again." : "The AI service couldn't be reached. Please try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Log status and error type only; request bodies can contain workspace data.
    const detail = await response.json().catch(() => null);
    console.error("[ai] error", response.status, detail?.error?.type ?? "");
    if (response.status === 401 || response.status === 403) throw new ServiceError("The AI service rejected the API key. Check ANTHROPIC_API_KEY.");
    if (response.status === 429) throw new ServiceError("The AI service is rate limiting requests. Wait a moment and try again.");
    if (response.status === 529 || response.status >= 500) throw new ServiceError("The AI service is busy right now. Please try again shortly.");
    throw new ServiceError("The AI request couldn't be completed.");
  }

  const body = (await response.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const call = body.content?.find((block) => block.type === "tool_use" && block.name === options.tool.name);
  if (!call || typeof call.input !== "object" || call.input === null) throw new ServiceError("The AI service returned an unexpected response. Please try again.");
  return {
    input: call.input as T,
    usage: { inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 },
  };
}
