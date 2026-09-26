import { Suspense } from "react";
import { SettingsView } from "@/components/settings/settings-view";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingBlock } from "@/components/ui/skeleton";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace, profile and data preferences." />
      <Suspense fallback={<LoadingBlock label="Loading settings" />}>
        <SettingsView />
      </Suspense>
    </>
  );
}
