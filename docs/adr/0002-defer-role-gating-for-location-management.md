# Defer role-based access control for Location management

Location tree management (create/delete/generate) is a destructive, structural operation, and it was tempting to gate it to an "admin" role. But no real role enum exists anywhere in the stack: `user.role` is an untyped string from the backend, and the only role vocabulary in the codebase (`components/modals/manage-access.tsx`) is a disconnected mock permission matrix that never calls an API. The Location backend docs don't mention role restrictions either. We decided not to add client-side gating now — a check against `user.role` with no backend enforcement would be trivially bypassed (edit the stored user object) and would misrepresent itself as real access control to anyone reading the code later. All logged-in users can manage the Location tree until the backend defines and enforces actual roles.

## Consequences

- Anyone with a valid session can create, delete, or restructure Locations, including deleting or moving samples' storage in the process (subject to the backend's own leaf/active-sample rules).
- When a real role system lands on the backend, this should be revisited — this ADR should be marked superseded at that point.
