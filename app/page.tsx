import Link from "next/link";

/*
 * Phase 0 placeholder. The real page (header, hero, menu, about, visit,
 * footer) is built in Phase 1 and reads all copy from /content. Keep this
 * minimal and plainly written - no invented cafe copy here.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-4xl text-foreground">Cafe site - foundation build</h1>
      <p className="mt-4 text-muted">
        Phase 0 is scaffolding only: design tokens, fonts and the style test page. The real layout,
        menu and copy arrive in later phases from /content.
      </p>
      <p className="mt-6">
        <Link
          href="/style-test"
          className="rounded-card bg-accent px-4 py-2 text-sm text-surface transition-colors hover:opacity-90"
        >
          Open the style test page
        </Link>
      </p>
      <p className="mt-3">
        <a href="/style-test" className="text-sm text-muted underline underline-offset-2">
          (same page, plain link for keyboard testing)
        </a>
      </p>
    </main>
  );
}
