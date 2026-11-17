import fs from "node:fs";

/*
 * Creates the local sqlite data directory before dev/build. Kept as a
 * literal path here because lib/db.ts deliberately does no runtime
 * directory creation.
 */
await fs.promises.mkdir("db", { recursive: true });
