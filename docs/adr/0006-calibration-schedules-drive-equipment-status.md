# Calibration Schedules drive the equipment table's due date and status, not `Equipment.NextCalibrationDue`

Phase 6 added `CalibrationSchedule` (many per Equipment, each with its own label, due date and
optional interval) but left `Equipment.NextCalibrationDue` in place — it still backs
`DerivedStatus()` (ready / due_soon / overdue) and `CalibrationPct()`, which is what the equipment
table's ring and status chip render today. `PATCH /equipment/{id}/calibration` still requires
`next_calibration_due` in its body, independently of the schedule auto-advance. So the same fact
lives in two places and a user could set them to disagree.

The UI treats **the soonest-due Schedule as the truth**: the "รอบสอบเทียบถัดไป" column, the remaining
-time ring and the status chip are all computed from the Schedule list, not from the scalar field.
The record-result form does not show a "next due date" input at all — the user picks which Schedule
the result belongs to and the frontend sends that Schedule's due date as `next_calibration_due`, so
the scalar field trails the schedules instead of competing with them.

The alternative — keep the scalar field driving the table and treat Schedules as detail-page
decoration — was rejected because it hides exactly the case the requirement asked for: a machine
whose internal check is current but whose external certification is two months overdue would show
green. Showing both in the table was rejected as two columns that contradict each other on screen.

## Consequences

- The equipment list needs every machine's schedules up front. Fetching them per row is N requests,
  so this depends on a new bulk endpoint from the backend — see `docs/backend-requests.md`.
  Until it exists the list keeps rendering the scalar field, and phase 6 is blocked on it.
- Equipment with no Schedule at all has no due date and no status to derive; it renders as
  "ยังไม่ตั้งรอบสอบเทียบ" rather than falling back to the scalar field, which would reintroduce the
  two-truths problem.
- `Equipment.NextCalibrationDue` is never edited directly by the UI. If the backend later drops it,
  nothing in the frontend needs to change except the calibration request body.
