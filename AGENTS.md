# Agent rules

You are building a landing page for a cafe. The full spec is in /docs/PRD.md.

Working rules:

1. Work on ONE phase at a time. Stop when its acceptance criteria are met and summarize.
2. Before any UI work, read /design/theme.png and /design/tokens.md. Use tokens only. Never hard-code colors or fonts.
3. Follow the Anti AI-slop rules in PRD Section 5 as hard constraints. No lorem ipsum, no emoji icons, no purple gradients, no generic centered hero.
4. All menu, hours, copy and links come from /content. Never hard-code them in components.
5. Prices are calculated on the server from menu.json. Never trust prices from the client.
6. Never put secrets in client code. Use .env.local and keep .env.example updated.
7. Use Framer Motion only in client components. Animate transform and opacity only. Respect prefers-reduced-motion.
8. Write tests for pricing, payment signature verification and the feedback validator.
9. Run lint, type-check and tests before declaring a phase done.
10. If something needed is missing (photo, copy, color, key), ask instead of inventing it.
11. Keep changes small and commits plain. Do not refactor unrelated files.
