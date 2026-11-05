"use client";

import { useEffect, useState } from "react";

/** 以 state 提供「現在時間」，避免在 render 中直接呼叫 Date.now()（不純） */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
