# Split the single in-memory router into per-module Next.js routes

The app has one route (`/`) rendering `LimsApp`, which switches between 9 modules via `useState<ModuleId>` — no real URLs, so refreshing, deep-linking, and browser back/forward don't work. We're migrating to real Next.js App Router routes, one per module (`/dashboard`, `/samples`, `/locations`, etc. — a 1:1 slug mapping from the existing `ModuleId` values), under a shared `app/(app)/` layout that carries the Sidebar/Topbar (migrated to `next/link` + `usePathname`) and the auth gate. `/` redirects to `/dashboard`. `AuthProvider` moves from being scoped inside `app/page.tsx` up to the root `app/layout.tsx` so all routes can read it; the `(app)` layout does the `useAuth()` check and still renders `<LoginForm/>` inline on failure rather than routing to a dedicated `/login` URL — auth tokens live in `localStorage`, so the check is client-side only regardless, and a real `/login` route buys nothing until that changes.

Migration is incremental: one module per checkbox task in `task.md` at the repo root, each independently completable in a separate session (no cross-module UI state needs to survive a page change). Each task moves a module's full logic from `components/modules/*.tsx` directly into its `app/(app)/[module]/page.tsx` and deletes the old file, rather than leaving a thin wrapper. `dashboard` goes first since it also carries the Sidebar migration every other task depends on. All tasks land and deploy together, not one at a time — mid-migration, the shared Sidebar would link to routes that don't exist yet for modules not yet migrated.

Out of scope for this pass: the modal system (`components/modal-router.tsx`) stays exactly as-is, not URL-based; sub-routes for drill-down views (`/locations/[id]`, sample detail pages) are deferred to a later pass; a real `/login` URL and moving auth tokens to cookies (to allow server-side/middleware route protection) are deferred as a separate future effort.

## Consequences

- The last task in `task.md` deletes `components/lims-app.tsx` and reduces `app/page.tsx` to just the `/` → `/dashboard` redirect, once every module has its own route.
- Until that migration completes, `LimsApp`'s switch and the new per-module routes coexist; nothing intermediate is deployed, so this dual state is never live in production.
- Location drill-down and sample detail remain non-linkable (local component state only) until a future sub-routes pass.
