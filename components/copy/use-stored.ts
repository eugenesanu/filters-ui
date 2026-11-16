"use client";

import { useEffect, useState } from "react";

/**
 * State remembered in localStorage between visits. The first render uses the fallback, so server and client agree;
 * the stored value arrives right after. Storage may be missing or refused: the page works without it.
 */
export function useStored<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored && (allowed as readonly string[]).includes(stored)) setValue(stored as T);
    } catch {}
    // allowed is a constant list per call site.
  }, [key]);

  const set = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {}
  };

  return [value, set] as const;
}
