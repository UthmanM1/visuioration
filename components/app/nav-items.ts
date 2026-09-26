import { BarChart3, Database, FileText, FolderKanban, LayoutDashboard, Settings, Share2, Sparkles, Users } from "lucide-react";

export const appNav = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, tour: "workspace" },
  { href: "/app/projects", label: "Projects", icon: FolderKanban, tour: "projects" },
  { href: "/app/datasets", label: "Datasets", icon: Database, tour: "data" },
  { href: "/app/visualizations", label: "Visualizations", icon: BarChart3, tour: "visualizations" },
  { href: "/app/reports", label: "Reports", icon: FileText, tour: "reports" },
  { href: "/app/insights", label: "AI Insights", icon: Sparkles, tour: "insights" },
  { href: "/app/shared", label: "Shared", icon: Share2 },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}
