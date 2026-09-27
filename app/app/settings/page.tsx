import { Suspense } from "react";
import { SettingsView } from "@/components/settings/settings-view";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingBlock } from "@/components/ui/skeleton";
import { datasetService } from "@/lib/services/datasets";
import { requireSession } from "@/lib/services/session";
import { workspaceService } from "@/lib/services/workspaces";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const [members, datasets] = await Promise.all([workspaceService.members(session.workspace.id), datasetService.list(session.workspace.id)]);
  return (
    <>
      <PageHeader title="Settings" description="Workspace, profile and data preferences." />
      <Suspense fallback={<LoadingBlock label="Loading settings" />}>
        <SettingsView key={session.workspace.id} members={members} datasets={datasets} />
      </Suspense>
    </>
  );
}
