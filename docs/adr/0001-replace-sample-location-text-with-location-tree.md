# Replace Sample's free-text `location` with the Location tree

`Sample` previously carried a free-text `location` string (set on create via `POST /samples`, displayed as-is). The backend now models storage as a proper Location tree (Cabinet → Shelf → Slot → Sub-slot) with its own put-away endpoint (`PATCH /samples/:id/location`). We decided to drop the free-text field entirely rather than keep it alongside `location_id` — the two would otherwise silently diverge (which one is "true" when they disagree?), and the frontend has no legacy data worth preserving (all existing `location` values are test data). Samples are now created with no location and put away as a separate, deliberate step.

## Consequences

- `SampleDTO.location` (string) is removed; the sample list/detail UI shows the tree's computed full path instead, sourced via `location_id`.
- A sample can have no location assigned (post-intake, pre-put-away) — this is an expected, not exceptional, state.
