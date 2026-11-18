import { getCopy, getMenu, getSite, menuImageExists } from "@/lib/content";
import { getPaymentProvider } from "@/lib/payments/razorpay";
import { SITE_URL } from "@/lib/site";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { MenuSection } from "@/components/Menu";
import { About } from "@/components/About";
import { Visit, Footer } from "@/components/Visit";
import { CartDrawer } from "@/components/CartDrawer";
import { FeedbackForm } from "@/components/FeedbackForm";
import { GalleryStrip } from "@/components/GalleryStrip";
import { FlyToCart } from "@/components/FlyToCart";
import { Reveal } from "@/components/Reveal";

const DAY_NAMES: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/*
 * Structured data (PRD Section 10): CafeOrCoffeeShop with opening hours and
 * the full menu, so search engines get prices, availability and hours
 * straight from /content. Built server-side from the same content files the
 * UI reads - no duplication.
 */
function buildStructuredData(site: ReturnType<typeof getSite>, menu: ReturnType<typeof getMenu>) {
  const openingHoursSpecification = Object.entries(site.hours).flatMap(([day, windows]) =>
    windows.map(([opens, closes]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_NAMES[day] ?? day,
      opens,
      closes,
    })),
  );

  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: site.name,
    description: site.tagline,
    url: SITE_URL,
    telephone: site.phone,
    image: `${SITE_URL}/gallery/hero.jpg`,
    servesCuisine: ["Coffee", "Bakery"],
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address,
      addressCountry: "IN",
    },
    openingHoursSpecification,
    hasMenu: {
      "@type": "Menu",
      name: `${site.name} menu`,
      hasMenuSection: menu.categories.map((category) => ({
        "@type": "MenuSection",
        name: category[0].toUpperCase() + category.slice(1),
        hasMenuItem: menu.items
          .filter((item) => item.category === category)
          .map((item) => ({
            "@type": "MenuItem",
            name: item.name,
            description: item.description,
            offers: {
              "@type": "Offer",
              price: item.price,
              priceCurrency: "INR",
              availability: item.available
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
            },
          })),
      })),
    },
  };
}

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

  const structuredData = buildStructuredData(site, menu);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header site={site} />
      <main>
        <Hero
          headline={copy["hero.headline"] ?? site.name}
          cafeName={site.name}
          tagline={site.tagline}
        />
        <MenuSection menu={menu} images={images} />
        <GalleryStrip />
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
      <FlyToCart />
    </>
  );
}
