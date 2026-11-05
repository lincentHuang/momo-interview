/**
 * 分享連結：將卡片設定以 base64url(UTF-8 JSON) 放進 `?config=`。
 * 解碼結果一律視為不可信輸入，交給 validateDraft 驗證後才能套用。
 */
export const SHARE_PARAM = "config";

export function encodeShare(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(encoded: string): unknown {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

export function buildShareUrl(origin: string, cardId: string, card: unknown): string {
  return `${origin}/cards/${encodeURIComponent(cardId)}?${SHARE_PARAM}=${encodeShare(card)}`;
}
