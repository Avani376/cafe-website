import { getCopy, getMenu, getSite, menuImageExists } from "@/lib/content";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { MenuSection } from "@/components/Menu";
import { About } from "@/components/About";
import { Visit, Footer } from "@/components/Visit";
import { CartDrawer } from "@/components/CartDrawer";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Reveal } from "@/components/Reveal";

/*
 * Single-page composition (PRD Section 3): hero, menu, about + links,
 * visit, feedback form, footer, cart drawer. All content comes from
 * /content (working rule 4); the payment provider is checked server-side so
 * the client knows whether online checkout is available.
 */
export default function Home() {
  const menu = getMenu();
  const site = getSite();
  const copy = getCopy();
  const provider = getPaymentProvider();
  const paymentMode: "razorpay" | "mock" | "unconfigured" =
    provider.name === "mock" ? "mock" : provider.isConfigured() ? "razorpay" : "unconfigured";

  const images: Record<string, boolean> = {};
  for (const item of menu.items) images[item.id] = menuImageExists(item);

  return (
    <>
      <Header site={site} />
      <main>
        <Hero
          headline={copy["hero.headline"] ?? site.name}
          cafeName={site.name}
          tagline={site.tagline}
        />
        <MenuSection menu={menu} images={images} />
        <About site={site} story={copy["about.story"] ?? ""} />
        <Visit site={site} />

        <section id="feedback" className="scroll-mt-24 border-t border-muted/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-12">
            <Reveal className="md:col-span-5">
              <h2 className="font-display text-4xl text-foreground">Feedback</h2>
              <p className="mt-4 max-w-prose text-muted">
                Thirty seconds, no account, no fuss. Tell us what worked and what did not - we read
                every note.
              </p>
              <p className="mt-3 text-sm text-muted/80">{copy["privacy.note"] ?? ""}</p>
            </Reveal>
            <Reveal delay={0.04} className="md:col-span-7">
              <FeedbackForm />
            </Reveal>
          </div>
        </section>
      </main>
      <Footer site={site} />
      <CartDrawer menu={menu} site={site} copy={copy} paymentMode={paymentMode} />
    </>
  );
}
