import { ContactForm } from "@/components/marketing/contact-form";
import { PageHero, Section } from "@/components/marketing/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Contact", description: "Tell us what you would like to explore with Visuioration.", path: "/contact" });

export default function ContactPage() {
  return (
    <>
      <PageHero title="Tell us what you want to understand." body="Share a little about your team and data. This is a demo form: nothing is sent, and you will see the confirmation state." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr] grid-cols-1">
          <ContactForm />
          <aside className="space-y-6 text-sm">
            <div>
              <h2 className="font-semibold">Prefer to look around first?</h2>
              <p className="mt-1 text-ink-muted">The demo workspace has every workflow running on fictional retail data.</p>
              <a href="/app" className="mt-2 inline-block font-medium text-petrol-700 underline underline-offset-4">Open the demo</a>
            </div>
            <div>
              <h2 className="font-semibold">Architecture questions</h2>
              <p className="mt-1 text-ink-muted">The technology page explains what is simulated in the demo and what a production build would connect.</p>
              <a href="/technology" className="mt-2 inline-block font-medium text-petrol-700 underline underline-offset-4">Read about the technology</a>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
