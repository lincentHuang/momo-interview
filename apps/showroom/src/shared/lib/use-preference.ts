"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 只屬於「這個瀏覽者」的介面偏好（例如 sidebar 收合），存在 localStorage。
 * 與卡片資料無關，因此不經過共享 Store、不跨宿主廣播。
 *
 * useSyncExternalStore：SSR 時回傳 fallback，避免 hydration mismatch；
 * 同時監聽 storage event，多分頁的偏好保持一致。
 */
const PREFIX = "showroom:pref:";
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null; // 隱私模式 / 被封鎖的儲存區
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePreference<T extends string>(key: string, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (read(key) as T | null) ?? fallback,
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(PREFIX + key, next);
      } catch {
        /* 無法保存時僅本次生效 */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
