# Thanes LIMS

Laboratory Information Management System — tracks samples through intake, testing, and storage.

## Language

### Storage Location

**Location**:
A node in the storage hierarchy where a sample can physically sit. Always one of four levels: Cabinet, Shelf, Slot, or Sub-slot, arranged as a strict 4-level tree (a node's children are always exactly one level below it — never skipped).
_Avoid_: Storage location (as a distinct term from Location), position, bin

**Cabinet**:
A root-level Location (no parent). The top of a storage tree, e.g. a fridge or cabinet unit.

**Shelf**, **Slot**, **Sub-slot**:
Locations one, two, and three levels below a Cabinet respectively. Each level's children are generated in a batch via a "generate children" action (a name prefix + count), not created one at a time.

**Leaf**:
A Location with no children. Only leaves can hold a sample. Leaf-ness is not a stored flag — it's inferred by fetching a Location's children and finding the list empty. Any level (including Cabinet) can be a leaf if it was never subdivided — e.g. a small fridge with no shelves is itself the storage spot.
_Avoid_: Sub-slot (as a synonym for leaf — most sub-slots are leaves, but a leaf can be any level)

**Full path**:
The human-readable chain from a Location's root Cabinet down to itself (e.g. "Fridge-A / Shelf-2 / Slot-4"). Computed live from the tree on every request — never stored. Renaming a node instantly changes the full path of everything beneath it.

**Active sample** (with respect to a Location):
A sample occupying a leaf whose status is `pending`, `testing`, or `completed` — i.e. still physically present. A sample with status `transferred` has left the building and no longer occupies its leaf, even though the sample record still references it.
_Avoid_: Occupied, assigned (these don't distinguish active vs. transferred)

**Put-away**:
The act of assigning a sample to a leaf Location, distinct in time and intent from sample intake. A sample is always created first (unassigned), then put away separately. Put-away can also mean *moving* a sample already at one leaf to another.
_Avoid_: Assign, store (use "put-away" for the workflow; "assigned to" is fine for the resulting state of a sample)
