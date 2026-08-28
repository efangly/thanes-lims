# `/equipment/[id]` is a full route, while `/samples` keeps `?s=<id>` on one route

ADR-0005 collapsed the samples module onto a single static route with the selected sample held in
`?s=<id>`, because switching a dynamic segment remounted the route subtree and made the list, its
filter and its scroll position flicker on every row click. Equipment now needs a detail view too,
and the obvious move would be to copy that pattern.

We are not copying it. Equipment detail is `app/(app)/equipment/[id]/page.tsx` — a full page that
replaces the list rather than sitting beside it.

The reason ADR-0005 exists is that the sample detail is a *panel next to a list that must stay put*;
remounting was pure loss. The equipment detail is not a panel: it carries the asset fields, the
Calibration Schedule table, the attached documents and the recent calibration history — three cards
that do not fit alongside a table, and none of which the user is scanning back and forth against the
list. Here the list genuinely goes away, so a remount is the intended transition, not a glitch.
`/locations/[id]` already works this way for the same reason.

## Consequences

- Two modules in the same app navigate differently on purpose. This ADR is the answer to "did someone
  forget to migrate equipment to ADR-0005?" — no.
- Back from an equipment detail returns to the list, unlike samples where Back leaves the module.
- The list's filter and scroll position are not preserved across a visit to a detail page. Accepted:
  the equipment list is short and searchable.
