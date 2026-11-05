"use client";

import { pluginRegistry, type CardVariant } from "@momo/merchant-card";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => pluginRegistry.subscribe(cb);
const getVersion = () => pluginRegistry.getVersion();

/** 目前 variant 可用的 plugin；registry 動態註冊時自動更新 */
export function useAvailablePlugins(variant: CardVariant) {
  useSyncExternalStore(subscribe, getVersion, () => 0);
  return pluginRegistry.available({ variant });
}
