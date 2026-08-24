# Per-module routing migration

See [`docs/adr/0003-per-page-routing-migration.md`](docs/adr/0003-per-page-routing-migration.md) for the full decision and rationale.

Each task below is independently completable in its own session. No cross-module UI state needs to survive a navigation, so tasks can be done in any order **except** `dashboard`, which must go first (it carries the Sidebar migration every other task depends on). Do not deploy after individual tasks — merge everything and deploy once all module tasks (and the final cleanup task) are done.

## 0. Dashboard + shared layout (do this first)

- [x] Create `app/(app)/layout.tsx`: move `AuthProvider` up from `app/page.tsx` to root `app/layout.tsx`; `(app)/layout.tsx` does the `useAuth()` gate (loading spinner / `<LoginForm/>` inline / render children) and renders `Sidebar` + `Topbar` around `{children}`
- [x] Migrate `Sidebar` from `onNavigate` callback + `active` state to `next/link` (`<Link href="/...">`) + `usePathname()` for highlighting the current item
- [x] Migrate `Topbar` to read the current module from `usePathname()` instead of `active` prop (keep the per-module "quick add" modal mapping as-is)
- [x] Create `app/(app)/dashboard/page.tsx`: move all logic from `components/modules/dashboard.tsx` into it; delete `components/modules/dashboard.tsx`
- [x] Update `DashboardView`'s internal navigation (dashboard cards that jump to other modules) from `onNavigate` prop to `<Link>`/`router.push` to the new module routes
- [x] Update `app/page.tsx` to `redirect("/dashboard")` (remove the old `Gate`/`LimsApp` rendering — but don't delete `components/lims-app.tsx` yet, other modules still depend on it until their own tasks land)
- [x] Verify build (`next build`) passes

## 1. Samples

- [x] Create `app/(app)/samples/page.tsx`: move all logic from `components/modules/samples.tsx` into it; delete `components/modules/samples.tsx`
- [x] Update any incoming links/references (e.g. dashboard cards, sidebar) to point at `/samples`
- [x] Verify build passes

## 2. AI Chat

- [x] Create `app/(app)/ai-chat/page.tsx`: move all logic from `components/modules/ai-chat.tsx` into it; delete `components/modules/ai-chat.tsx`
- [x] Update any incoming links/references to point at `/ai-chat`
- [x] Verify build passes

## 3. Locations

- [x] Create `app/(app)/locations/page.tsx`: move all logic from `components/modules/locations.tsx` into it; delete `components/modules/locations.tsx` (keep the cabinet/shelf/slot drill-down as local component state — no sub-routes yet, see ADR 0003)
- [x] Update any incoming links/references to point at `/locations`
- [x] Verify build passes

## 4. Equipment

- [x] Create `app/(app)/equipment/page.tsx`: move all logic from `components/modules/equipment.tsx` into it; delete `components/modules/equipment.tsx`
- [x] Update any incoming links/references to point at `/equipment`
- [x] Verify build passes

## 5. Environment

- [x] Create `app/(app)/environment/page.tsx`: move all logic from `components/modules/environment.tsx` into it; delete `components/modules/environment.tsx`
- [x] Update any incoming links/references to point at `/environment`
- [x] Verify build passes

## 6. Inventory

- [x] Create `app/(app)/inventory/page.tsx`: move all logic from `components/modules/inventory.tsx` into it; delete `components/modules/inventory.tsx`
- [x] Update any incoming links/references to point at `/inventory`
- [x] Verify build passes

## 7. Documents

- [x] Create `app/(app)/documents/page.tsx`: move all logic from `components/modules/documents.tsx` into it; delete `components/modules/documents.tsx`
- [x] Update any incoming links/references to point at `/documents`
- [x] Verify build passes

## 8. Tests

- [x] Create `app/(app)/tests/page.tsx`: move all logic from `components/modules/tests.tsx` into it; delete `components/modules/tests.tsx`
- [x] Update any incoming links/references to point at `/tests`
- [x] Verify build passes

## 9. Cleanup (do this last, after all 9 modules above are done)

- [x] Delete `components/lims-app.tsx` (done as part of task 8 — `tests` was the last module still referenced by it, so it became dead code that broke the build)
- [x] Confirm `app/page.tsx` contains only the `/` → `/dashboard` redirect
- [x] Search the codebase for any remaining imports of `components/lims-app.tsx` or the old `components/modules/*.tsx` files and remove them (none found — `components/modules/` is now empty/gone)
- [x] Verify build passes
- [ ] Merge and deploy

## Deferred (not part of this migration — future work)

- Sub-routes for drill-down views (`/locations/[id]`, sample detail pages)
- A real `/login` URL and moving auth tokens from `localStorage` to cookies, to support server-side/middleware route protection
- Converting the modal system (`components/modal-router.tsx`) to URL-based (parallel/intercepting) routes
