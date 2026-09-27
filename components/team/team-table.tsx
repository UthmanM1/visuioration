"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { User } from "@/lib/demo-data";
import { useAppSession } from "@/components/app/session-context";

const roleTone = { Owner: "dark", Admin: "dusk", Member: "petrol", Analyst: "petrol", Marketing: "amber", Executive: "dusk", Viewer: "neutral" } as const;

export function TeamTable({ initialMembers, projectCounts }: { initialMembers: User[]; projectCounts: Record<string, number> }) {
  const toast = useToast();
  const session = useAppSession();
  const live = session.mode === "live";
  const [members, setMembers] = useState<Array<User & { pending?: boolean }>>(initialMembers);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email")).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (members.some((m) => m.email === email)) {
      setError("This person is already a member.");
      return;
    }
    const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const role = String(data.get("role")) as User["role"];
    setMembers((m) => [...m, { id: email, name, initials: name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(), email, role, title: "Invited", lastActive: "Invitation pending", permissions: role === "Executive" ? "Can comment" : "Can edit", color: "#8A939C", pending: true }]);
    setError(null);
    setOpen(false);
    toast({ tone: "success", title: "Invitation created", body: `Demo only: no email was sent to ${email}.` });
  }

  const projectCount = (id: string) => projectCounts[id] ?? 0;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)} icon={<UserPlus className="h-4 w-4" aria-hidden />}>Add member</Button>
      </div>
      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Workspace members</caption>
            <thead className="border-b border-line bg-paper/60 text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Member</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Role</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Permissions</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Projects</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 font-normal">
                    <span className="flex items-center gap-3">
                      <Avatar user={m} />
                      <span>
                        <span className="block font-medium text-ink">{m.name}</span>
                        <span className="block text-[12px] text-ink-muted">{m.title}</span>
                      </span>
                    </span>
                  </th>
                  <td className="px-3 py-3"><Badge tone={roleTone[m.role]}>{m.role}</Badge></td>
                  <td className="px-3 py-3 text-ink-soft">{m.permissions}</td>
                  <td className="tnum px-3 py-3 text-right">{projectCount(m.id)}</td>
                  <td className="px-5 py-3 text-ink-muted">{m.pending ? <Badge tone="amber">Invitation pending</Badge> : m.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-line md:hidden">
          {members.map((m) => (
            <li key={m.id} className="flex items-start gap-3 p-4">
              <Avatar user={m} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{m.name}</p>
                  <Badge tone={roleTone[m.role]}>{m.role}</Badge>
                </div>
                <p className="text-[12px] text-ink-muted">{m.permissions} · {projectCount(m.id)} projects</p>
                <p className="text-[12px] text-ink-faint">{m.pending ? "Invitation pending" : m.lastActive}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {live ? (
        <Modal open={open} onClose={() => setOpen(false)} title="Add member" size="sm" footer={<Button onClick={() => setOpen(false)}>Close</Button>}>
          <p className="text-sm text-ink-muted">Email invitations are being connected. Once they arrive, you&apos;ll be able to invite teammates to {session.workspace.name} and choose their role.</p>
        </Modal>
      ) : null}
      <Modal open={open && !live} onClose={() => { setOpen(false); setError(null); }} title="Add member" description={`Invite someone to ${session.workspace.name}.`} size="sm" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="invite-form">Send invitation</Button></>}>
        <form id="invite-form" onSubmit={invite} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="invite-email" error={error ?? undefined}>
            <Input id="invite-email" name="email" type="email" placeholder="name@northstar.example" data-autofocus aria-invalid={!!error} aria-describedby={error ? "invite-email-error" : undefined} />
          </Field>
          <Field label="Role" htmlFor="invite-role" hint="Analysts and Marketing can edit; Executives can view and comment.">
            <Select id="invite-role" name="role" defaultValue="Analyst">
              <option>Analyst</option>
              <option>Marketing</option>
              <option>Executive</option>
              <option>Viewer</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </>
  );
}
