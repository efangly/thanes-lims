# Sample selection lives in the `/samples?s=<id>` query param on one route, not a dynamic segment

ADR-0004 merged `/samples` + `/samples/[id]` into a single optional-catch-all route
(`app/(app)/samples/[[...id]]/page.tsx`) with selection held as local `useState` synced to the URL via
`router.replace('/samples/${id}')`. In practice the screen still flickered on every row click: switching
the matched segment between "absent" and "present" re-rendered the page subtree (replaying the
`animate-fade` wrapper), the memoized `SampleTable` received fresh `filtered`/`onSelect` refs each render,
and `useCoC`/`useFullPath` reset to empty before refetching.

We collapsed it to a single static route `app/(app)/samples/page.tsx` (`<Suspense><SamplesView/></Suspense>`)
and moved the selected id into the `?s=<id>` search param, read with `useSearchParams()` as the single
source of truth (no `selectedId` state). Changing a search param does not remount the route tree — only
components that call `useSearchParams` re-render — so the list, filter, scroll position and KPI header stay
put. `filtered` is now `useMemo`'d, `select` is `useCallback`'d, and `useCoC` keeps the previous steps
while the next sample loads.

Considered keeping selection as pure client state with no URL (simplest, but loses reload/back/share) and
keeping the dynamic `[id]` route behind a shared persistent `layout.tsx` (works, but more files and the
`/samples` vs `/samples/[id]` split still buys nothing here). The query param satisfies
reload/back/deep-link on one route with the least machinery.

## Consequences

- `app/(app)/samples/[[...id]]/page.tsx` is deleted; `SamplesView` no longer takes an `activeId` prop.
- `/samples` with no `?s=` redirects (`router.replace`) to the first row once data has loaded.
- Row clicks use `router.replace`, so browser Back returns to the page before `/samples`, not through each
  previously viewed sample.
- Supersedes ADR-0004. `locations` drill-down still uses its own route param approach and is unaffected.
