import type { CardInput } from "./card.schema";

/** 無外部請求的商品圖：以 SVG data URI 產生（題目要求不呼叫真實網站資源） */
export function placeholderImage(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 92%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 65% 80%)"/>
</linearGradient></defs>
<rect width="400" height="400" fill="url(#g)"/>
<circle cx="200" cy="170" r="88" fill="hsl(${hue} 55% 60% / .35)"/>
<text x="200" y="300" font-family="system-ui,sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="hsl(${hue} 40% 30%)">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Showroom 種子資料。函式形式：flash-sale 的 endsAt 必須以「當下」計算。
 * 商品內容為虛構示意，非 momo 真實資料。
 */
export function createFixtures(now = Date.now()): CardInput[] {
  const hour = 60 * 60 * 1000;
  return [
    {
      id: "std-airfryer",
      variant: "standard",
      title: "【Philips 飛利浦】健康氣炸鍋 6.2L 大容量 HD9257",
      imageUrl: placeholderImage("氣炸鍋", 20),
      price: 3990,
      originalPrice: 5990,
      rating: 4.8,
      reviewCount: 2318,
      soldCount: 12500,
      extensions: { "fast-delivery": { label: "8H到貨" }, coupon: { amount: 200 } },
    },
    {
      id: "std-towel",
      variant: "standard",
      title: "【台灣製】極細纖維超吸水浴巾 3入組",
      imageUrl: placeholderImage("浴巾", 200),
      price: 599,
      originalPrice: 990,
      rating: 4.6,
      reviewCount: 845,
      soldCount: 3200,
      layout: "list",
      extensions: { gift: { text: "加贈旅行收納袋" } },
    },
    {
      id: "flash-earbuds",
      variant: "flash-sale",
      title: "【限時瘋搶】真無線藍牙降噪耳機 IPX5 防水",
      imageUrl: placeholderImage("耳機", 280),
      price: 1290,
      originalPrice: 2990,
      rating: 4.5,
      reviewCount: 532,
      endsAt: now + 2 * hour + 15 * 60 * 1000,
      stockTotal: 500,
      stockSold: 382,
      extensions: { "fast-delivery": { label: "24H到貨" }, installment: { periods: 6 } },
    },
    {
      id: "live-skincare",
      variant: "live",
      title: "【直播限定】玻尿酸保濕精華 50ml 買一送一",
      imageUrl: placeholderImage("精華液", 330),
      price: 1680,
      originalPrice: 3360,
      rating: 4.9,
      reviewCount: 1204,
      liveStatus: "live",
      viewers: 12800,
      hostName: "momo 小編",
      extensions: { coupon: { amount: 100 }, gift: { text: "贈旅行組" } },
    },
    {
      id: "rank-rice",
      variant: "ranking",
      title: "【池上】一等米 3kg 真空包裝",
      imageUrl: placeholderImage("池上米", 45),
      price: 459,
      rating: 4.7,
      reviewCount: 9800,
      rank: 1,
      rankCategory: "生鮮熱銷",
      extensions: { "fast-delivery": { label: "超商取貨" } },
    },
  ];
}
