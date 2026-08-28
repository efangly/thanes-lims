# One Location browser serves both trees, parameterised by Kind

Phase 2 added a second Location tree (`equipment_storage`: Building → Room → Zone → Cabinet → Shelf)
next to the original `sample_storage` tree (Cabinet → Shelf → Slot → Sub-slot). The frontend had no
notion of Kind at all: `lib/data.ts` hard-codes four level labels, `components/locations-view.tsx`
hard-codes `sub_slot` as "deepest level, cannot subdivide", and the roots request relies on the
backend defaulting to `sample_storage`.

Rather than a second view for the second tree, `LocationsView`, `use-location-browser` and the
location picker take a `kind`, and the per-kind facts — the ordered level list, the label for each
level, and therefore which level is deepest — move into one config keyed by Kind. `/locations` gets
a tab to switch trees; the pickers in the equipment and inventory forms are the same browser locked
to `equipment_storage`.

Copying the view was rejected: the drill-down, the breadcrumb, the batch "generate children" action
and the barcode lookup are identical in both trees, and a copy would drift — the first bug fixed in
one and not the other is the whole cost of this decision, paid quietly.

## Consequences

- Nothing may derive a level's meaning from its name alone. `cabinet` is depth 1 in one tree and
  depth 4 in the other; every level question goes through the Kind config.
- Any future tree (a third Kind) is a config entry, not a new screen.
- A Location picker must always be told its Kind. There is no sensible default now that two trees
  exist — the backend's "empty means sample_storage" fallback is not relied on.
