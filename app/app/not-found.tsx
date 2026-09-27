import { FolderSearch } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <EmptyState
      className="mt-8"
      icon={<FolderSearch className="h-5 w-5" />}
      title="We couldn't find that"
      body="It may have been deleted, or it belongs to a different workspace. Check the workspace switcher at the top of the page."
      action={<ButtonLink href="/app">Back to dashboard</ButtonLink>}
    />
  );
}
