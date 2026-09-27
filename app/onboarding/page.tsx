import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { pageMetadata } from "@/lib/seo";
import { requireSession } from "@/lib/services/session";

export const metadata = pageMetadata({ title: "Set up your workspace", description: "Set up your Visuioration workspace.", path: "/onboarding", noIndex: true });

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.mode === "demo") return <OnboardingFlow />;
  return <OnboardingFlow live initialName={session.user.name.split(" ")[0]} initialWorkspace={session.workspace.name} />;
}
