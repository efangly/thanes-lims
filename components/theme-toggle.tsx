"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Icons } from "@/lib/icons";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: `theme` is read from localStorage synchronously
  // on the client's first render, so don't trust it (icon, aria-label, title)
  // until after mount, when it's guaranteed to match the server-rendered HTML.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      title={isDark ? "โหมดสว่าง" : "โหมดมืด"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative grid h-9.5 w-9.5 place-items-center rounded-lg border border-line text-muted transition hover:bg-bg"
    >
      {mounted ? (
        isDark ? (
          <Icons.Sun className="h-4.25 w-4.25" />
        ) : (
          <Icons.Moon className="h-4.25 w-4.25" />
        )
      ) : (
        <span className="h-4.25 w-4.25" />
      )}
    </button>
  );
}
