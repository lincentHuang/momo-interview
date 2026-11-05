// 純邏輯入口：不會註冊 Custom Element，可安全地在 SSR / Node 環境 import
export * from "./schema/card.schema";
export * from "./schema/fields";
export * from "./schema/variants";
export { migrateCard } from "./schema/migrate";
export { createFixtures, placeholderImage } from "./schema/fixtures";
export * from "./core/pricing";
export * from "./core/countdown";
export * from "./plugins/types";
export { PluginRegistry, pluginRegistry, type ResolvedPlugin } from "./plugins/registry";
export { BUILTIN_PLUGINS, registerBuiltinPlugins } from "./plugins/builtin";
export * from "./store/types";
export { createCardStore, DEFAULT_CHANNEL_NAME, DEFAULT_STORAGE_KEY, type CardStore, type CardStoreOptions, type UpsertResult } from "./store/card-store";
export { getSharedStore } from "./store/shared-store";
export { shouldReplace } from "./store/merge";
