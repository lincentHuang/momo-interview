import type { CardRecord } from "./types";

/** LWW 判定：incoming 是否應取代 local */
export function shouldReplace(local: CardRecord | undefined, incoming: CardRecord): boolean {
  if (!local) return true;
  if (incoming.rev !== local.rev) return incoming.rev > local.rev;
  return incoming.origin > local.origin;
}
