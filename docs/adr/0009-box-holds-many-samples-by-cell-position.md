# A Box is a Location that holds many samples by Cell position

The `sample_storage` tree assumed every put-away spot holds exactly one sample: a
Leaf Location, occupancy enforced by "one active sample per `location_id`". Real
labs store samples in gridded boxes (cryoboxes, 96-well plates) where one physical
box holds dozens of samples in addressable positions. Modelling each position as
its own Sub-slot Location was rejected — it puts hundreds of nodes per box into
the tree, wrecks Full Path and the breadcrumb, and collides with the batch
"generate children" mental model.

Instead a **Box** is a Location with a new `level_type` of `'box'`. It carries a
Grid (`rows`, `cols` columns on `locations`, non-null only for boxes) and can hang
off a Shelf, Slot, or Sub-slot — it is not a fixed depth. It never has child
Locations. A **Cell** is not a node: it is a `position` string (`A1`, `H12`)
stored on the sample. Occupancy for boxes is "one active sample per
`(location_id, position)`"; for every other Leaf the existing per-`location_id`
rule is unchanged. A sample in a box always has a position — there is no
partial state.

## Consequences

- `level_type` is no longer a pure depth indicator in the sample tree: `box` is a
  terminal marker that can appear at depth 2, 3, or 4. Leaf-ness now means "no
  children **and not a box**".
- `samples.position` is null for every sample not in a box, including all existing
  rows — no data migration.
- Moving samples around a box grid is a batch operation
  (`POST /locations/:boxId/moves` with `[{sample_id, position}]`, one
  transaction) so a drag of a multi-selection or a two-Cell swap is atomic. A
  resulting position clash fails the whole batch with 409.
- Boxes only grow. Shrinking a grid would need "are all the trailing cells empty?"
  validation for a case that barely happens; make a new box and move instead.
- Cross-box moves are ordinary Put-away, not a grid drag — keeps the drag
  interaction and its concurrency surface small.
