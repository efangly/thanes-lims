"use client";

import { useState } from "react";
import type { Location, LocationKind } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Field } from "@/components/ui";
import { LocationPicker } from "@/components/location-picker";

/**
 * Compact wrapper around <LocationPicker> for use inside a form: shows the
 * chosen node as a chip and hides the drill-down tree until the user opens it.
 * Selection is a plain leaf id — the picker never creates nodes.
 */
export function LocationField({
  label = "ตำแหน่งจัดเก็บ",
  kind = "equipment_storage",
  value,
  valueLabel,
  onChange,
  disabled = false,
}: {
  label?: string;
  kind?: LocationKind;
  value: string | null;
  /** Display name of the currently selected location (caller keeps it around). */
  valueLabel?: string | null;
  onChange: (location: Location | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Field label={label}>
      {value && !open ? (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-[13px]">
          <Icons.Loc className="h-[15px] w-[15px] flex-none text-teal-d" />
          <span className="flex-1 truncate">{valueLabel || value}</span>
          {!disabled && (
            <>
              <button type="button" onClick={() => setOpen(true)} className="text-[12px] text-teal-d hover:underline">
                เปลี่ยน
              </button>
              <button type="button" onClick={() => onChange(null)} className="text-[12px] text-muted hover:underline">
                ล้าง
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-line p-2">
          <LocationPicker
            kind={kind}
            enableScan
            disabled={disabled}
            onSelect={(loc) => {
              onChange(loc);
              setOpen(false);
            }}
          />
          {value && (
            <button type="button" onClick={() => setOpen(false)} className="mt-2 text-[12px] text-muted hover:underline">
              ยกเลิกการเปลี่ยน
            </button>
          )}
        </div>
      )}
    </Field>
  );
}
