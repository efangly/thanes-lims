"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Icons } from "@/lib/icons";
import { Seg } from "@/components/ui";
import type { PanelLayout } from "@/lib/use-panel-layout";

/**
 * `lg` breakpoint (1024px) as a live boolean. Used so only ONE of the two
 * layouts below is actually mounted — rendering both (and just CSS-hiding one)
 * means every `panel.content` mounts twice, which doubles data fetches and,
 * worse, mounts two of any stateful child (e.g. a preview `<iframe>` whose PDF
 * viewer mutates the DOM, which then crashes React's reconciler).
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isDesktop;
}

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
  const isDesktop = useIsDesktop();

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

  if (!isDesktop) {
    return (
      <div>
        <div className="mb-3">
          <Seg options={panels.map((p) => p.title)} value={mobilePane} onChange={onMobilePane} />
        </div>
        {panels[mobilePane]?.content}
      </div>
    );
  }

  return (
    <>
      {/* Desktop: N columns + splitters. `h-full min-h-0` so a page that hands
          this a bounded flex-1 slot (e.g. `/documents`) gets full-height panels;
          on a page with no height constraint (e.g. `/locations`) it collapses to
          content height as before. */}
      <div ref={containerRef} className="flex h-full min-h-0 items-stretch gap-1">
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
                <div
                  className="flex min-w-0 flex-col"
                  style={{ flexGrow: layout.widths[i], flexShrink: 1, flexBasis: 0 }}
                >
                  <div className="mb-1.5 flex flex-none items-center justify-between px-1">
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
                  <div className="min-h-0 flex-1">{panel.content}</div>
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
