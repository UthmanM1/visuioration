import { cn } from "@/lib/format";
import type { User } from "@/lib/demo-data";

export function Avatar({ user, size = "md", className }: { user: Pick<User, "initials" | "color" | "name">; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-[11px]", lg: "h-11 w-11 text-sm" };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface", sizes[size], className)}
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      <span aria-hidden>{user.initials}</span>
      <span className="sr-only">{user.name}</span>
    </span>
  );
}

export function AvatarStack({ users, max = 4 }: { users: User[]; max?: number }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size="sm" />
      ))}
      {users.length > max ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-paper text-[10px] font-semibold text-ink-muted ring-2 ring-surface">+{users.length - max}</span> : null}
    </div>
  );
}
