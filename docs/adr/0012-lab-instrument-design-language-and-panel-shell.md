# 12. Lab-instrument design language and 3-panel shell

Date: 2026-09-09

## Status

Accepted

## Context

The UI was hand-built (bespoke component kit, self-hosted Thai font, inline-SVG
charts) but still read as an "AI-generated dashboard": the teal `#0a9396` + navy
palette is a well-known coolors "teal-to-orange" set; every page followed the same
`PageHead → 4 KPI cards with accent bar → Card` formula; the chatbot was a generic
"Copilot" with a robot avatar, a 3-step thinking stepper and an indeterminate bar;
`font-mono` was mapped to the (non-mono) Thai face; status was shown as filled
pills; `rounded-[10px]` + a two-layer `shadow-card` gave the stock "premium AI UI"
finish.

We want an identity that is unmistakably *this* product: a lab instrument.

## Decision

**Design language — "lab bench, paper & ink".**

- Palette: paper/cream ground, near-black ink, hairline rules, and a **single**
  accent — cobalt "label tape" (`#2f4b8f`). The `teal*` tokens were renamed to
  `accent*` repo-wide. Status colours are desaturated, borrowed from printed
  hazard/label conventions (amber caution, red stop, green go). The `violet` tone
  was removed.
- Type: Anuphan stays for all running text and headings; **IBM Plex Mono** is
  added for every machine value — IDs, barcodes, grid coordinates, quantities,
  SQL. The old `--font-mono → Anuphan` mapping is gone.
- Material: no shadows anywhere (`--shadow-card: none`); 4px radius; focus is a
  2px ink outline, not a border-colour shift. Decorative motion (page fade-in,
  chatbot indeterminate bar) removed; functional motion kept (sync pulse, alert
  ring, barcode scan). An engineering-paper `.bg-graph` texture is used only on
  genuine grid surfaces (BoxGrid).
- Status is a specimen-label **chip**: hairline border, transparent ground, mono
  caps, a square marker in the tone colour.
- The per-page KPI card grid is replaced inside panel layouts by a `ReadoutStrip`
  — one hairline-ruled band of label/value pairs.

**Shell — the 3-panel browser (ADR-0010) is the app-wide pattern.**

- The 248px sidebar becomes a ~56px icon rail (tooltips, corner `01`–`06`
  numerals kept as a quirk, a single bottom `SYNC` status LED).
- `/samples` is now a 3-panel browser (`ทะเบียน | บันทึกตัวอย่าง | Chain of
  Custody`) built on the same `ResizablePanels` + `usePanelLayout` as
  `/locations`; `usePanelLayout` takes a storage-key argument
  (`lims.samples.panels`). Selection stays in `?s=` (ADR-0005).
- Other modules (`/equipment`, `/tests`, `/inventory`, `/vendors`, `/documents`,
  calibration) inherit the new tokens and shell now; converting them to 3-panel
  is deferred, following ADR-0011's regression-risk caution.
- The topbar is restyled to a thin instrument header for now rather than fully
  dissolved into per-panel headers — dissolving it touches all ~10 pages and is
  left as follow-up.

**Dark mode is kept** (Q13), remapped mechanically to a dark-paper palette; it is
not separately art-directed.

## Consequences

- Single source of visual truth: change a token in `globals.css`, the whole app
  moves. The `accent` rename means any new code must use `accent*`, never `teal*`.
- `/samples` gained `ResizablePanels`; its old wide-table view is gone — the
  registry is now a compact list, full columns live in the record panel.
- The chatbot is a "SQL query console": no persona, no stepper; the genuinely
  useful SQL accordion is kept.
- Login page keeps its beaker motif (now on-identity).
- Not yet done: per-page 3-panel conversion for the remaining modules; full
  topbar dissolution; visual QA of authenticated screens (needs the backend).
