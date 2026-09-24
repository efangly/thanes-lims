# Equipment Cal / MA / Overall status comes from the backend, not from client-side schedule math

ADR-0006 had the frontend derive each machine's status chip from its soonest-due Calibration
Schedule, because the backend's `status` still read the scalar `next_calibration_due`. Adding
Maintenance Schedules would have doubled that client-side math — and the Dashboard card counts
would have had to download every machine and every schedule just to count them.

The backend now computes three statuses on every read (`../backend/docs/equipment-maintenance-frontend-guide.md`):
`calibration_status` (soonest Calibration Schedule, falling back to `next_calibration_due` when a
machine has none), `maintenance_status` (soonest Maintenance Schedule, `none` when there is none),
and `overall_status` (the worse of the two: overdue > due_soon > ready > none). It also serves
`GET /equipment/summary` with the counts. **The UI renders those values as-is**; it no longer
decides ready / due_soon / overdue itself. Schedules are still fetched in bulk
(`/calibration-schedules`, `/maintenance-schedules`) only to show the next due dates and the ring.

This supersedes ADR-0006's status derivation. ADR-0006's other decision — the record-result form
sends the chosen Schedule's due date instead of taking a typed one — still stands.

## Consequences

- `none` is shown as "ไม่มีแผน" (grey), never "พร้อม". A machine with no Maintenance Schedule is
  not "ready", it has no plan. Because Calibration falls back to the scalar field, the Cal side is
  never `none` in practice, so the old "ยังไม่ตั้งรอบสอบเทียบ" chip is gone.
- The deprecated `status` field is no longer read; `Equipment.status` is built from `calibration_status`.
- Any Schedule create / edit / delete or Maintenance Event invalidates the `["equipment"]` query
  prefix, which also covers the summary, because the statuses may have moved.
- The grid's `?overall_status=` / `?calibration_status=` / `?maintenance_status=` filters use the
  backend's query names so a Dashboard card link reads the same as the API call, but they filter the
  already-cached `/equipment` list client-side instead of issuing a second request.
