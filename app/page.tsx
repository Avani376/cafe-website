import { getCopy, getMenu, getSite, menuImageExists } from "@/lib/content";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { MenuSection } from "@/components/Menu";
import { About } from "@/components/About";
import { Visit, Footer } from "@/components/Visit";
import { CartDrawer } from "@/components/CartDrawer";
import { Reveal } from "@/components/Reveal";

/*
 * Single-page composition (PRD Section 3): hero, menu, about + links,
 * visit, footer, cart drawer. All content comes from /content (working
 * rule 4); the payment provider is checked server-side so the client knows
 * whether online checkout is available.
 *
 * The feedback form arrives in Phase 5; a plainly written placeholder keeps
 * the header anchor working until then.
 */
export default function Home() {
  const menu = getMenu();
  const site = getSite();
  const copy = getCopy();
  const paymentConfigured = getPaymentProvider().isConfigured();

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
          <div className="mx-auto max-w-6xl px-4 py-16">
            <Reveal>
              <h2 className="font-display text-4xl text-foreground">Feedback</h2>
              <p className="mt-4 max-w-prose text-muted">
                The feedback form arrives in a later phase of this build. Until then, tell us in
                person or through the links above.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer site={site} />
      <CartDrawer menu={menu} site={site} copy={copy} paymentConfigured={paymentConfigured} />
    </>
  );
}
