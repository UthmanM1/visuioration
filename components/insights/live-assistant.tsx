"use client";

import Link from "next/link";
import { ArrowUp, CheckCircle2, Info, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { useAppSession } from "@/components/app/session-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { askAiAction } from "@/lib/actions/ai";
import type { AiAnswer, EvidenceItem } from "@/lib/ai/types";
import { cn } from "@/lib/format";
import { makeFormatter, toQueryResult } from "@/lib/visualizations/definition";

type Turn = { id: string; question: string; answer?: AiAnswer; error?: string };

const STEPS = ["Reading your dataset's columns…", "Planning the queries…", "Running them in the database…", "Checking every number in the explanation…"];

function formatFact(value: number, format: string) {
  if (format === "percent") return `${value}%`;
  if (format === "integer") return value.toLocaleString("en-US");
  return makeFormatter(format as "currency" | "decimal")(value, false);
}

function Evidence({ item, primary }: { item: EvidenceItem; primary: boolean }) {
  return (
    <figure className={cn("rounded-lg border border-line p-3", primary && "xl:col-span-2")}>
      <figcaption className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-ink-soft">{item.title}</span>
        <span className="text-[11px] text-ink-faint">{item.id}</span>
      </figcaption>
      <ChartRenderer kind={item.kind} result={toQueryResult(item.data, item.kind)} height={item.kind === "kpi" ? 130 : 190} title={item.title} />
      <details className="mt-2 text-[12px]">
        <summary className="cursor-pointer text-ink-muted hover:text-ink">How this was calculated</summary>
        <p className="mt-2 text-ink-soft">{item.description}</p>
        {item.facts.length ? (
          <table className="mt-2 w-full text-left">
            <caption className="sr-only">Computed facts for {item.title}</caption>
            <tbody>
              {item.facts.map((f) => (
                <tr key={f.label} className="border-t border-line">
                  <th scope="row" className="py-1 pr-3 font-normal text-ink-muted">{f.label}</th>
                  <td className="tnum py-1 text-right font-medium text-ink">{formatFact(f.value, f.format)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </details>
    </figure>
  );
}

export function LiveAssistant({ configured, suggestions, hasData }: { configured: boolean; suggestions: string[]; hasData: boolean }) {
  const { user } = useAppSession();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  // Rotate the progress message while waiting; the real stages run on the server.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => window.clearInterval(timer);
  }, [pending]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending || !configured) return;
    const id = crypto.randomUUID();
    setTurns((t) => [...t, { id, question: q }]);
    setInput("");
    setStep(0);
    setPending(true);
    track("ai_question_submitted", { length: q.length });
    const result = await askAiAction({ question: q });
    setTurns((t) => t.map((x) => (x.id === id ? (result.ok ? { ...x, answer: result.data } : { ...x, error: result.error }) : x)));
    setPending(false);
    inputRef.current?.focus();
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
            <p className="text-[12px] text-ink-muted">Answers are calculated from your datasets in the database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {configured ? <Badge tone="petrol"><CheckCircle2 className="h-3 w-3" aria-hidden />Verified numbers</Badge> : <Badge tone="outline">Not connected</Badge>}
          {turns.length ? <Button variant="ghost" size="sm" onClick={() => setTurns([])} icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}>New chat</Button> : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-busy={pending}>
        {!configured ? (
          <div className="mx-auto max-w-lg py-8 text-center">
            <p className="font-display text-2xl font-semibold tracking-[-0.02em]">AI isn&apos;t connected yet</p>
            <p className="mt-2 text-[14px] text-ink-muted">An administrator needs to add an <code className="rounded bg-paper px-1">ANTHROPIC_API_KEY</code> environment variable and redeploy. Your charts and dashboards work without it.</p>
          </div>
        ) : turns.length === 0 ? (
          <div className="mx-auto max-w-lg py-6 text-center">
            <p className="font-display text-2xl font-semibold tracking-[-0.02em]">Ask your data a question.</p>
            <p className="mt-2 text-[14px] text-ink-muted">Every answer comes from queries run on your data, with the charts and figures behind it.</p>
            {hasData ? (
              <ul className="mt-6 grid gap-2 text-left sm:grid-cols-2 grid-cols-1">
                {suggestions.map((q) => (
                  <li key={q}>
                    <button onClick={() => ask(q)} className="w-full rounded-lg border border-line bg-paper/60 px-3.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:border-petrol-500 hover:text-ink">{q}</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-[13px] text-ink-muted">Start by <Link href="/app/datasets?import=1" className="font-medium text-petrol-700 underline underline-offset-4">importing a dataset</Link>.</p>
            )}
          </div>
        ) : (
          <ol className="space-y-6">
            {turns.map((turn) => (
              <li key={turn.id} className="space-y-4">
                <div className="flex items-start justify-end gap-2.5">
                  <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-night px-4 py-2.5 text-[14px] text-white">{turn.question}</p>
                  <Avatar user={user} size="sm" className="mt-1 hidden sm:inline-flex" />
                </div>
                {turn.answer ? (
                  <div className="flex animate-rise gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-petrol-50 text-petrol-600" aria-hidden><Sparkles className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink" data-testid="ai-answer">{turn.answer.answer}</p>
                      {turn.answer.status === "answered" ? (
                        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-muted">
                          {turn.answer.explanation === "model" ? <><CheckCircle2 className="h-3.5 w-3.5 text-petrol-600" aria-hidden />Every number above was checked against the query results.</> : <><Info className="h-3.5 w-3.5 text-amber-500" aria-hidden />Summary generated directly from the computed figures.</>}
                        </p>
                      ) : null}
                      {turn.answer.evidence.length ? (
                        <div className={cn("mt-4 grid gap-3", turn.answer.evidence.length > 1 && "xl:grid-cols-2")} aria-label="Evidence">
                          {turn.answer.evidence.map((item, i) => <Evidence key={item.id} item={item} primary={i === 0 && turn.answer!.evidence.length === 3} />)}
                        </div>
                      ) : null}
                      {turn.answer.notes.map((note) => <p key={note} className="mt-2 rounded-md bg-paper px-3 py-2 text-[12px] text-ink-muted">{note}</p>)}
                      {turn.answer.dataset ? (
                        <p className="mt-3 text-[12px] text-ink-faint">
                          Source: <Link href={`/app/datasets/${turn.answer.dataset.slug}`} className="underline underline-offset-2">{turn.answer.dataset.name}</Link>
                          {turn.answer.evidence[0] ? ` · ${turn.answer.evidence[0].data.matched.toLocaleString("en-US")} rows matched` : ""}
                        </p>
                      ) : null}
                      {turn.answer.followUps.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {turn.answer.followUps.map((f) => (
                            <button key={f} onClick={() => ask(f)} disabled={pending} className="rounded-full border border-line-strong px-3 py-1 text-left text-[12px] text-ink-soft hover:border-petrol-500 hover:text-petrol-700 disabled:opacity-50">{f}</button>
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
                      {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-petrol-500" style={{ animationDelay: `${i * 160}ms` }} />)}
                    </span>
                    <span className="text-[13px] text-ink-muted">{STEPS[step]}</span>
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
            maxLength={500}
            disabled={!configured}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            placeholder={configured ? "Ask about totals, trends, comparisons or breakdowns…" : "AI isn't connected"}
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || pending || !configured} aria-label="Send question">
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-ink-faint">The AI provider receives column names, a few example values and each query&apos;s aggregated results, never your raw rows.</p>
      </form>
    </section>
  );
}
