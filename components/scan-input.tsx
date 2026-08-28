"use client";

import { useRef, useState } from "react";
import { Icons } from "@/lib/icons";

/**
 * The one input every scan in the app goes through — sample barcodes, location
 * barcodes, inventory lookups.
 *
 * It is a plain text field on purpose: the lab uses USB/Bluetooth wedge scanners,
 * which type the code as keystrokes and end with Enter, so a text field is already
 * a scanner driver — and it stays usable by hand when a label is too scuffed to read.
 * (A camera adapter can be added later behind the same props; nothing outside here
 * would change.)
 *
 * Resolution fires on **Enter only**, never on keystrokes: a scanner delivers the
 * code one character at a time, so a debounce-as-you-type field would fire a request
 * per character.
 *
 * On a miss the text is kept and selected rather than cleared, so the next scan
 * overwrites it in place while a person typing by hand can still see what they got wrong.
 */
export function ScanInput({
  onScan,
  placeholder = "สแกนหรือพิมพ์บาร์โค้ด แล้วกด Enter",
  label,
  autoFocus = false,
  autoRefocus = false,
  disabled = false,
  className = "",
}: {
  /** Resolve the scanned code. Reject (or return false) to signal "not found" and keep the text selected. */
  onScan: (code: string) => void | boolean | Promise<void | boolean>;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  /** Keep the cursor in the field after every scan — for stations where the operator holds a scanner and never touches the mouse. */
  autoRefocus?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const code = value.trim();
    if (!code || busy) return;
    setBusy(true);
    try {
      const ok = await onScan(code);
      if (ok === false) {
        inputRef.current?.select();
      } else {
        setValue("");
      }
    } catch {
      // The caller reports the failure (toast); here we only keep the text
      // around so a re-scan overwrites it.
      inputRef.current?.select();
    } finally {
      setBusy(false);
      if (autoRefocus) inputRef.current?.focus();
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-[12px] font-medium text-muted">{label}</span>}
      <div className="relative">
        <Icons.Arrow className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-teal-d" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            submit();
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled || busy}
          aria-label={label ?? "ช่องสแกนบาร์โค้ด"}
          className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-[92px] font-mono text-[13px] text-ink outline-none transition focus:border-teal disabled:opacity-60"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-2">
          {busy ? "กำลังค้นหา…" : "กด Enter"}
        </span>
      </div>
    </div>
  );
}
