---
name: Importing a standalone legacy repo
description: Notes for when a user asks to import an existing GitHub repo "exactly as is", replacing the default pnpm-workspace/artifacts scaffold.
---

- The default scaffold's root `.npmrc` sets `registry=http://package-firewall.replit.local/npm/`. Deleting it during a wholesale replace still worked because the registry is also set via env vars; if 403s appear on specific packages afterward, that's the Replit package firewall blocking a specific (often older/vulnerable) version, not a missing `.npmrc`.
  **Why:** hit this when importing an external repo's own `package.json`/lockfile pinned to an old `vitest` version — firewall returned 403 for that exact tarball.
  **How to apply:** on a 403 from the package firewall during install, bump the flagged package to `@latest` via `installLanguagePackages` rather than trying to add tokens or bypass the firewall.
- When replacing the scaffold with an external repo's exact file tree, the platform's own `.replit` (workflows/deployment config) gets overwritten by the repo's copy. Replit's platform re-parses the new `.replit` and surfaces the repo's own `[[workflows.workflow]]` entries as real workflows automatically — no manual `configureWorkflow` call was needed.
- After replacing the scaffold, previously-registered artifacts (from `artifacts/` dirs that got deleted) become unregistered automatically; `listArtifacts()` returns empty and the project falls back to being a plain (non-artifact) deployable project.
