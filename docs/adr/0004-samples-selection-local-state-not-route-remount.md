# Sample selection is local state synced to an optional-catch-all route, not two separate pages

`components/samples-view.tsx` backed both `app/(app)/samples/page.tsx` and `app/(app)/samples/[id]/page.tsx`, and rows selected a sample via `router.push('/samples/${id}')`. Because those are two distinct Next.js route/page components, every click unmounted and remounted the entire view (table, filters, scroll position, Chain-of-Custody panel) instead of just updating the detail pane. We merged the two routes into a single `app/(app)/samples/[[...id]]/page.tsx` (optional catch-all — Next.js only supports the array form, so `params.id` is `string[] | undefined` and the sample id is `id?.[0]`), split `SamplesView` into `SampleTable` + `SampleDetailPanel`, and made selection a local `useState` in the shared parent. Clicking a row updates that state directly (no remount) and calls `router.replace('/samples/${id}', { scroll: false })` to keep the URL shareable/deep-linkable, rather than dropping the `[id]` URL entirely.

We considered dropping the `/samples/[id]` URL and keeping selection as pure client state (simpler, but loses deep-linking to a specific sample) and considered leaving the two-route structure and building a non-remounting transition around it (more complex, still two page components to keep in sync). The optional-catch-all route was chosen because it satisfies both constraints — one page component, no remount, URL still reflects the selected sample — for a modest routing change.

## Consequences

- `app/(app)/samples/page.tsx` and `app/(app)/samples/[id]/page.tsx` no longer exist as separate files; both URLs are served by `app/(app)/samples/[[...id]]/page.tsx`.
- This narrows the "sub-routes for drill-down views... deferred to a later pass" note in ADR-0003: sample detail is still URL-addressable, but as an optional segment on the list route rather than a fully separate page.
- Any future per-page module that needs a list+detail pattern (e.g. `locations`) should default to this same optional-catch-all shape rather than two separate pages, to avoid reintroducing the same remount bug.
