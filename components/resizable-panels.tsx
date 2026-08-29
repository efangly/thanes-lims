"use client";

import { Fragment, useRef, type ReactNode } from "react";
import { Icons } from "@/lib/icons";
import { Seg } from "@/components/ui";
import type { PanelLayout } from "@/lib/use-panel-layout";

export interface PanelDef {
  key: string;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
}

/**
 * The 3-panel frame for `/locations` (ADR-0010). Desktop (`lg`+): three columns
 * with draggable splitters and per-panel collapse; widths + collapsed state come
 * from `usePanelLayout` (persisted). Below `lg`: one panel at a time with a
 * segmented switcher.
 */
export function ResizablePanels({
  panels,
  layout,
  setWidth,
  toggleCollapsed,
  mobilePane,
  onMobilePane,
}: {
  panels: PanelDef[];
  layout: PanelLayout;
  setWidth: (index: number, width: number) => void;
  toggleCollapsed: (index: number) => void;
  mobilePane: number;
  onMobilePane: (i: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const totalPx = el.getBoundingClientRect().width;
    const startX = e.clientX;
    const wA = layout.widths[index];
    const wB = layout.widths[index + 1];
    const sum = wA + wB;

    const totalFrac = layout.widths.reduce((a, b) => a + b, 0);

    const onMove = (ev: PointerEvent) => {
      const dxFrac = ((ev.clientX - startX) / totalPx) * totalFrac;
      let nextA = wA + dxFrac;
      let nextB = wB - dxFrac;
      if (nextA < 0.15) {
        nextA = 0.15;
        nextB = sum - nextA;
      }
      if (nextB < 0.15) {
        nextB = 0.15;
        nextA = sum - nextB;
      }
      setWidth(index, nextA);
      setWidth(index + 1, nextB);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      {/* Mobile: one pane at a time */}
      <div className="lg:hidden">
        <div className="mb-3">
          <Seg options={panels.map((p) => p.title)} value={mobilePane} onChange={onMobilePane} />
        </div>
        {panels[mobilePane]?.content}
      </div>

      {/* Desktop: 3 columns + splitters */}
      <div ref={containerRef} className="hidden items-stretch gap-1 lg:flex">
        {panels.map((panel, i) => {
          const collapsed = layout.collapsed[i];
          return (
            <Fragment key={panel.key}>
              {collapsed ? (
                <button
                  onClick={() => toggleCollapsed(i)}
                  className="flex w-9 flex-none flex-col items-center gap-2 rounded-[10px] border border-line bg-panel py-3 text-muted transition hover:text-ink"
                  title={`เปิด ${panel.title}`}
                >
                  <Icons.Chevron className="h-3.5 w-3.5" />
                  <span className="[writing-mode:vertical-rl] text-[11px] font-medium">{panel.title}</span>
                </button>
              ) : (
                <div className="min-w-0" style={{ flexGrow: layout.widths[i], flexShrink: 1, flexBasis: 0 }}>
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.7px] text-muted">
                      {panel.icon}
                      {panel.title}
                    </span>
                    <button
                      onClick={() => toggleCollapsed(i)}
                      className="grid h-5 w-5 place-items-center rounded text-muted-2 transition hover:text-ink"
                      title={`หุบ ${panel.title}`}
                    >
                      <Icons.Chevron className="h-3 w-3 rotate-180" />
                    </button>
                  </div>
                  {panel.content}
                </div>
              )}

              {i < panels.length - 1 && !collapsed && !layout.collapsed[i + 1] && (
                <div
                  onPointerDown={startDrag(i)}
                  className="w-1.5 flex-none cursor-col-resize self-stretch rounded-full bg-line/60 transition hover:bg-teal"
                  role="separator"
                  aria-orientation="vertical"
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
