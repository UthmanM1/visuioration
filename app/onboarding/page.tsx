import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Set up your workspace", description: "Set up a Visuioration demo workspace.", path: "/onboarding", noIndex: true });

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
