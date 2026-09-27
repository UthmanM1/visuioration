"use client";

import { Check, Copy, Download, ExternalLink, Link2, Pencil, Presentation, RefreshCw, Share2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppSession } from "@/components/app/session-context";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics";
import { createShareAction, listSharesAction, refreshShareAction, revokeShareAction } from "@/lib/actions/reports";
import type { RenderedReport } from "@/lib/reports/sections";
import type { ShareLink } from "@/lib/services/live-reports";
import { LivePresentation } from "./live-report-view";

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "On a date…" },
  { value: "never", label: "Never" },
];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function expiryText(link: ShareLink) {
  if (link.state === "revoked") return "Turned off";
  if (!link.expiresAt) return "Never expires";
  const ms = new Date(link.expiresAt).getTime() - Date.now();
  if (ms <= 0) return `Expired ${when(link.expiresAt)}`;
  const days = Math.round(ms / 86400000);
  const hours = Math.round(ms / 3600000);
  return `Expires ${days >= 2 ? `in ${days} days` : hours >= 1 ? `in ${hours} hour${hours === 1 ? "" : "s"}` : "within the hour"} (${when(link.expiresAt)})`;
}

export function LiveShareDialog({ open, onClose, reportId }: { open: boolean; onClose: () => void; reportId: string }) {
  const toast = useToast();
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("7");
  const [customDate, setCustomDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const url = (token: string) => `${window.location.origin}/share/${token}`;

  const load = useCallback(async () => {
    const result = await listSharesAction({ reportId });
    if (result.ok) setLinks(result.data);
    else toast({ tone: "error", title: "Couldn't load links", body: result.error });
  }, [reportId, toast]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listSharesAction({ reportId }).then((result) => {
      if (cancelled) return;
      if (result.ok) setLinks(result.data);
      else toast({ tone: "error", title: "Couldn't load links", body: result.error });
    });
    return () => {
      cancelled = true;
    };
  }, [open, reportId, toast]);

  async function create() {
    if (expiry === "custom" && !customDate) {
      toast({ tone: "error", title: "Choose an expiry date" });
      return;
    }
    setBusy("create");
    const result = await createShareAction({ reportId, label, expiresInDays: expiry === "never" || expiry === "custom" ? null : Number(expiry), expiresAt: expiry === "custom" ? customDate : null });
    setBusy(null);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't create the link", body: result.error });
      return;
    }
    setLabel("");
    track("report_shared", { expiry });
    await copy(result.data.token);
    await load();
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(url(token));
    } catch {
      /* Clipboard can be unavailable (e.g. insecure context); the link is still shown in the list. */
    }
    setCopied(token);
    toast({ tone: "success", title: "Link copied", body: "Anyone with this link can view the report until it expires." });
    window.setTimeout(() => setCopied(null), 2000);
  }

  async function refresh(link: ShareLink) {
    setBusy(link.id);
    const result = await refreshShareAction({ shareId: link.id });
    setBusy(null);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't update the link", body: result.error });
    toast({ tone: "success", title: "Shared version updated", body: "The link now shows the report as it is now." });
    load();
  }

  async function revoke(link: ShareLink) {
    setBusy(link.id);
    const result = await revokeShareAction({ shareId: link.id });
    setBusy(null);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't turn off the link", body: result.error });
    toast({ tone: "info", title: "Link turned off", body: "People with the link can no longer open the report." });
    load();
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <Modal open={open} onClose={onClose} title="Share report" description="Links show a snapshot of the report as it looks when the link is created or updated." size="lg" footer={<Button variant="secondary" onClick={onClose}>Done</Button>}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-line p-4 sm:grid-cols-[1fr_150px]">
          <Field label="Label (optional)" htmlFor="share-label" hint="For your reference, e.g. “Board pack”.">
            <Input id="share-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Link expires" htmlFor="share-expiry">
            <Select id="share-expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          {expiry === "custom" ? (
            <Field label="Expiry date" htmlFor="share-date" className="sm:col-span-2" hint="The link stops working at the end of this day (UTC).">
              <Input id="share-date" type="date" min={minDate} value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <Button onClick={create} loading={busy === "create"} icon={<Link2 className="h-4 w-4" aria-hidden />}>Create link</Button>
          </div>
        </div>

        <div>
          <h3 className="text-[13px] font-semibold">Links</h3>
          {links === null ? (
            <p className="mt-2 text-[13px] text-ink-muted">Loading…</p>
          ) : links.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-muted">No links yet. Nobody outside the workspace can see this report.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line" aria-label="Share links">
              {links.map((link) => (
                <li key={link.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                      {link.label || `Link created ${when(link.createdAt)}`}
                      <Badge tone={link.state === "active" ? "petrol" : "outline"}>{link.state === "active" ? "Active" : link.state === "expired" ? "Expired" : "Turned off"}</Badge>
                    </p>
                    <p className="text-[12px] text-ink-muted">{expiryText(link)}</p>
                    {link.snapshotAt ? <p className="text-[11px] text-ink-faint">Snapshot from {when(link.snapshotAt)}</p> : null}
                  </div>
                  {link.state === "active" ? (
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <Button size="sm" variant="secondary" onClick={() => copy(link.token)} icon={copied === link.token ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}>{copied === link.token ? "Copied" : "Copy"}</Button>
                      <a href={`/share/${link.token}`} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "sm")} aria-label="Open shared view"><ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
                      <Button size="sm" variant="ghost" onClick={() => refresh(link)} loading={busy === link.id} aria-label="Update snapshot" title="Update snapshot"><RefreshCw className="h-3.5 w-3.5" aria-hidden /></Button>
                      <Button size="sm" variant="ghost" onClick={() => revoke(link)} disabled={busy === link.id} aria-label="Turn off link" title="Turn off link" className="hover:text-rust-700"><Trash2 className="h-3.5 w-3.5" aria-hidden /></Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="rounded-md bg-paper px-3 py-2 text-[12px] text-ink-muted">Anyone with an active link can view and download the snapshot without signing in. Viewers can&apos;t see the workspace, other reports or the underlying data.</p>
      </div>
    </Modal>
  );
}

export function LiveReportToolbar({ report, reportId, slug }: { report: RenderedReport; reportId: string; slug: string }) {
  const { canEdit } = useAppSession();
  const [share, setShare] = useState(false);
  const [present, setPresent] = useState(false);
  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        {canEdit ? <ButtonLink href={`/app/reports/new?id=${reportId}`} variant="ghost" icon={<Pencil className="h-4 w-4" aria-hidden />}>Edit</ButtonLink> : null}
        {canEdit ? <Button variant="secondary" onClick={() => setShare(true)} icon={<Share2 className="h-4 w-4" aria-hidden />}>Share</Button> : null}
        <a href={`/app/reports/${slug}/pdf`} className={buttonClasses("secondary", "md")} download><Download className="h-4 w-4" aria-hidden />Export PDF</a>
        <Button onClick={() => setPresent(true)} icon={<Presentation className="h-4 w-4" aria-hidden />}>Present</Button>
      </div>
      {canEdit ? <LiveShareDialog open={share} onClose={() => setShare(false)} reportId={reportId} /> : null}
      <LivePresentation report={report} open={present} onClose={() => setPresent(false)} />
    </>
  );
}

export function SharedReportToolbar({ report, token }: { report: RenderedReport; token: string }) {
  const toast = useToast();
  const [present, setPresent] = useState(false);
  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
            } catch {
              /* ignore */
            }
            toast({ tone: "success", title: "Link copied" });
          }}
          icon={<Share2 className="h-4 w-4" aria-hidden />}
        >
          Share
        </Button>
        <a href={`/share/${token}/pdf`} className={buttonClasses("secondary", "md")} download><Download className="h-4 w-4" aria-hidden />Download</a>
        <Button onClick={() => setPresent(true)} icon={<Presentation className="h-4 w-4" aria-hidden />}>Presentation mode</Button>
      </div>
      <LivePresentation report={report} open={present} onClose={() => setPresent(false)} />
    </>
  );
}
