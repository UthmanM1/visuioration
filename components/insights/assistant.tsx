"use client";

import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { DemoTag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { useAppSession } from "@/components/app/session-context";
import { cn } from "@/lib/format";
import { askAssistant } from "@/lib/services/insights";
import type { AssistantAnswer } from "@/lib/services/insights";
import { EvidenceChart, evidenceTitles } from "./evidence-chart";

export const recommendedQuestions = [
  "Why did revenue decline in March?",
  "Which region is underperforming?",
  "What products are driving growth?",
  "How does mobile conversion compare?",
  "What changed this month?",
  "Where should we investigate next?",
];

type Turn = { id: string; question: string; answer?: AssistantAnswer; error?: string };

export function Assistant() {
  const { user: currentUser } = useAppSession();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    const id = crypto.randomUUID();
    setTurns((t) => [...t, { id, question: q }]);
    setInput("");
    setPending(true);
    track("ai_question_submitted", { length: q.length });
    try {
      const answer = await askAssistant(q);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: "The assistant could not answer. Try again." } : x)));
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <section aria-labelledby="assistant-title" className="flex min-h-[560px] flex-col rounded-panel border border-line bg-surface shadow-panel">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-night text-amber-100"><Sparkles className="h-4 w-4" aria-hidden /></span>
          <div>
            <h2 id="assistant-title" className="text-[15px] font-semibold">Visuioration Intelligence</h2>
            <p className="text-[12px] text-ink-muted">Answers from Northstar Sales Data and Marketing Performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DemoTag>Simulated</DemoTag>
          {turns.length ? (
            <Button variant="ghost" size="sm" onClick={() => setTurns([])} icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}>New chat</Button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-busy={pending}>
        {turns.length === 0 ? (
          <div className="mx-auto max-w-lg py-6 text-center">
            <p className="font-display text-2xl font-semibold tracking-[-0.02em]">Ask your data a question.</p>
            <p className="mt-2 text-[14px] text-ink-muted">Answers name the period, the comparison and the numbers used, with charts as evidence.</p>
            <ul className="mt-6 grid gap-2 text-left sm:grid-cols-2 grid-cols-1">
              {recommendedQuestions.map((q) => (
                <li key={q}>
                  <button onClick={() => ask(q)} className="w-full rounded-lg border border-line bg-paper/60 px-3.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:border-petrol-500 hover:text-ink">{q}</button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="space-y-6">
            {turns.map((turn) => (
              <li key={turn.id} className="space-y-4">
                <div className="flex items-start justify-end gap-2.5">
                  <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-night px-4 py-2.5 text-[14px] text-white">{turn.question}</p>
                  <Avatar user={currentUser} size="sm" className="mt-1 hidden sm:inline-flex" />
                </div>
                {turn.answer ? (
                  <div className="flex animate-rise gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-petrol-50 text-petrol-600" aria-hidden><Sparkles className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] leading-relaxed text-ink">{turn.answer.answer}</p>
                      {turn.answer.evidence.length ? (
                        <div className={cn("mt-4 grid gap-3", turn.answer.evidence.length > 1 && "xl:grid-cols-2")}>
                          {turn.answer.evidence.map((kind, i) => (
                            <figure key={kind} className={cn("rounded-lg border border-line p-3", turn.answer!.evidence.length === 3 && i === 0 && "xl:col-span-2")}>
                              <figcaption className="mb-2 text-[12px] font-medium text-ink-muted">{evidenceTitles[kind]}</figcaption>
                              <EvidenceChart kind={kind} height={190} />
                            </figure>
                          ))}
                        </div>
                      ) : null}
                      {turn.answer.sources.length ? (
                        <p className="mt-3 text-[12px] text-ink-faint">Sources: {turn.answer.sources.join(" · ")}. Generated from demo data.</p>
                      ) : null}
                      {turn.answer.followUps.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {turn.answer.followUps.map((f) => (
                            <button key={f} onClick={() => ask(f)} disabled={pending} className="rounded-full border border-line-strong px-3 py-1 text-[12px] text-ink-soft hover:border-petrol-500 hover:text-petrol-700 disabled:opacity-50">{f}</button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : turn.error ? (
                  <p role="alert" className="rounded-md bg-rust-100 px-3 py-2 text-[13px] text-rust-700">{turn.error}</p>
                ) : (
                  <div className="flex items-center gap-3" role="status">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-petrol-50 text-petrol-600" aria-hidden><Sparkles className="h-3.5 w-3.5" /></span>
                    <span className="flex gap-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-petrol-500" style={{ animationDelay: `${i * 160}ms` }} />
                      ))}
                    </span>
                    <span className="text-[13px] text-ink-muted">Analyzing the dataset…</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-line p-3 sm:p-4">
        <label htmlFor="assistant-input" className="sr-only">Ask a question about your data</label>
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-surface p-1.5 focus-within:border-petrol-500 focus-within:ring-2 focus-within:ring-petrol-100">
          <textarea
            ref={inputRef}
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            placeholder="Ask about revenue, regions, products, conversion or acquisition…"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] placeholder:text-ink-faint focus:outline-none"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || pending} aria-label="Send question">
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-ink-faint">Simulated assistant: answers are composed from demo data, no AI model is called.</p>
      </form>
    </section>
  );
}
