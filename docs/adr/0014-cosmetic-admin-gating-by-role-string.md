# Gate admin-only pages/menus by role string (cosmetic, not security)

ADR-0002 deferred client-side role gating because there was no real role enum
and any `user.role` check "would misrepresent itself as real access control".
That reasoning still holds for *enforcement* — the backend owns that, and every
`/users/*` write endpoint is gated by an RBAC permission and answers 403. But
the user-management UI introduces a genuine UX need: a Scientist or General user
should not see an "ผู้ดูแลระบบ" section in the sidebar or land on a `/users`
page that only 403s.

We decided to add **cosmetic** gating only: the sidebar admin group and the
`/users` route render (or redirect) based on `user.role === "admin"`, which the
`/users/me` payload already carries. This is presentation, not a security
boundary — the backend 403 is still the only thing that actually stops a
non-admin, exactly as ADR-0002 requires. `/profile` (self-service) stays open to
every authenticated role.

## Consequences

- Editing the stored user object still "unlocks" the admin menu — and still
  gets 403 on every write. That is acceptable and intentional.
- If Lab Manager (`user:view`) later needs read access to the user list, this
  check moves from the bare `role` string to a permission list on `/users/me`;
  ADR-0002's note about that still applies.
- This ADR does not supersede ADR-0002 — it narrows it: gating for *chrome*,
  never for *enforcement*.

## Update — permission-based gating (equipment)

Equipment needs finer gating than admin / not-admin: logging Maintenance needs `equipment:edit`,
logging a Calibration result needs `equipment:approve`. The access token already carries the role's
permissions as `module:action` strings (backend ADR 0002), so `AuthUser.permissions` is read from
the token's payload and `useCan("equipment:edit")` hides the matching buttons. Same rule as above:
this is chrome, not enforcement — the payload is decoded, never verified, and the backend still 403s.

