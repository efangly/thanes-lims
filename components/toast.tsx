"use client";

import { Icons } from "@/lib/icons";
import { useLims } from "@/components/lims-data-context";

const toneCls = {
  teal: "bg-teal-bg text-teal-d",
  amber: "bg-amber-bg text-amber",
  red: "bg-red-bg text-red",
  green: "bg-green-bg text-green",
  violet: "bg-violet-bg text-violet",
  grey: "bg-bg-2 text-muted",
};

export function ToastStack() {
  const { toasts, dismissToast } = useLims();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex w-[300px] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-panel px-[13px] py-3 shadow-card animate-fade"
        >
          <span className={`grid h-7 w-7 flex-none place-items-center rounded-full ${toneCls[t.tone]}`}>
            <Icons.Check className="h-[14px] w-[14px]" />
          </span>
          <span className="text-[12.5px] font-medium text-ink">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
