import { z } from "zod";

/**
 * momo 前台 API 的「原始」資料形狀（2026-11 實測 www.momoshop.com.tw 首頁）。
 *
 * 原則：
 * - 只宣告 adapter 會讀到的欄位，其餘用 looseObject 原樣保留 —— momo 隨時可能加欄位，不能因此驗證失敗。
 * - 數字一律是字串且帶千分位（"1,090"）、URL 與名稱常被 percent-encode、HTML entity（"&#24215;"）也會出現，
 *   這些清洗都在 map.ts 做，raw schema 只負責「形狀」。
 * - 欄位命名隨 API 不同：getRecommendGoods / getFeaturedGoodsList 用 goodsName / imgUrl，
 *   首頁區塊 contentInfo 用 title / contentImage。adapter 把兩種都收斂成同一張 Card。
 *
 * 詳細欄位對照見 docs/momo-data-format.md。
 */

const str = z.string().optional();

/** { basePrice: { sign: "$", price: "1,090", strPrice: "起" | "", goodsStatus: "" } }；部分區塊會給空物件 */
export const RawPriceModel = z.looseObject({
  basePrice: z.looseObject({ sign: str, price: str, strPrice: str, goodsStatus: str }).optional(),
});
export type RawPriceModel = z.infer<typeof RawPriceModel>;

/** 商品行銷標（getRecommendGoods / getFeaturedGoodsList 的 icon[]） */
export const RawIcon = z.looseObject({
  iconContent: str,
  /** isCp（折價券）/ isRegister（登記）/ isGift（贈品）；其他行銷標沒有這個欄位 */
  iconContentType: str,
  iconBgColor: str,
  iconContentColor: str,
  /** 以圖片呈現的標（例如「速 最快今日」、「雙11必買」） */
  iconImgUrl: str,
  /** "0" 第一列（到貨時效）/ "1" 第二列（行銷標） */
  displayLayer: str,
});
export type RawIcon = z.infer<typeof RawIcon>;

/** 首頁區塊 contentInfo 的 goodsTag[]：content 是 HTML entity，例如 "&#24215;&#8314;" =「店⁺」、"&#38928;" =「預」 */
export const RawGoodsTag = z.looseObject({ content: str, bgColor: str, textColor: str, imgUrl: str });

const RawAction = z.looseObject({
  actionType: z.union([z.string(), z.number()]).optional(),
  actionValue: str,
  actionUrl: str,
  extraValue: z.looseObject({}).optional(),
});

/** 追蹤用：mdiv（版位代碼）與 blockItemId；換頁或點擊埋點時需原樣帶回 */
const RawBlockItem = z.looseObject({ itemType: str, blockItemId: str, itemAttrs: z.looseObject({ goodsCode: str }).optional() });

/** getRecommendGoods（你可能會喜歡）與 getFeaturedGoodsList（精選好物榜）的商品 */
export const RawGoodsInfo = z.looseObject({
  goodsCode: z.string(),
  goodsName: z.string(),
  goodsSubName: str,
  imgUrl: z.string(),
  imgUrlArray: z.array(z.string()).optional(),
  imgTagUrl: str,
  imgBottomTagUrl: str,
  vodUrl: str,
  goodsPriceModel: RawPriceModel.optional(),
  marketPriceModel: RawPriceModel.optional(),
  /** 舊欄位，已格式化字串（"$1,690"）；priceModel 缺漏時才使用 */
  goodsPrice: str,
  marketPrice: str,
  icon: z.array(RawIcon).optional(),
  goodsTag: z.array(RawGoodsTag).optional(),
  action: RawAction.optional(),
  blockItem: RawBlockItem.optional(),
  /** 精選好物榜才有：TOP 旗標底圖（Rank_tag_red.png） */
  rankBgImgUrl: str,
});
export type RawGoodsInfo = z.infer<typeof RawGoodsInfo>;

/** 首頁區塊（bt_7_777 輪播商品、bt_7_713 限時搶購）的 contentInfo[] */
export const RawColumnGoods = z.looseObject({
  goodsCode: str,
  title: z.string(),
  subTitle: str,
  contentImage: z.string(),
  imgTagUrl: str,
  imgBottomTagUrl: str,
  vodUrl: str,
  goodsPriceModel: RawPriceModel.optional(),
  marketPriceModel: RawPriceModel.optional(),
  goodsTag: z.array(RawGoodsTag).optional(),
  /** 限時搶購：剩餘組數字串 */
  remainingAmount: str,
  action: RawAction.optional(),
  /** 限時搶購：actionV2.extraValue.limitGoodsSellInterval { startDate, endDate }（epoch ms） */
  actionV2: z
    .looseObject({
      extraValue: z
        .looseObject({
          limitGoodsSellInterval: z.looseObject({ startDate: z.number().optional(), endDate: z.number().optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
  blockItem: RawBlockItem.optional(),
});
export type RawColumnGoods = z.infer<typeof RawColumnGoods>;

/** getMainPageV5 的區塊；只有 columnType / blockTypeId 一定存在，其餘依區塊而異 */
export const RawMainBlock = z.looseObject({
  columnType: z.string(),
  blockTypeId: z.string(),
  blockName: str,
  blockTypeName: str,
  mdiv: str,
  columnBgColor: str,
  headerInfo: z
    .looseObject({
      headerImage: str,
      serverTime: z.number().optional(),
      /** 限時搶購區塊的檔次結束時間（epoch ms） */
      endTime: z.number().optional(),
      countDownBgColor: str,
      titleUrl: str,
    })
    .optional(),
  /** 只有「商品型」區塊才有；廣告 / 看板區塊用 adInfo */
  contentInfo: z.array(z.unknown()).optional(),
});
export type RawMainBlock = z.infer<typeof RawMainBlock>;

/** momo API 共通外框：success + resultCode 字串 */
const envelope = { success: z.boolean(), resultCode: z.string(), resultMessage: str };

export const RawMainPageResponse = z.looseObject({ ...envelope, mainInfo: z.array(RawMainBlock).default([]) });
export const RawRecommendResponse = z.looseObject({
  ...envelope,
  rtnData: z
    .looseObject({
      mdiv: str,
      blockName: str,
      curPage: z.union([z.string(), z.number()]).optional(),
      maxPage: z.union([z.string(), z.number()]).optional(),
      goodsInfoList: z.array(z.unknown()).default([]),
    })
    .nullable()
    .optional(),
});
export const RawFeaturedKeywordsResponse = z.looseObject({
  ...envelope,
  resultList: z.array(z.looseObject({ value: z.string(), methodName: str, sourceOrigin: str })).default([]),
});
export const RawFeaturedListResponse = z.looseObject({
  ...envelope,
  resultList: z.looseObject({ keyword: str, goodsList: z.array(z.unknown()).default([]) }).optional(),
});
/** eccapi getGoodsSaleCountsV2：評分 / 評價數 / 銷量是另一支 API，以 goodsCode 為 key */
export const RawSaleInfo = z.looseObject({ rating: str, ratingTimes: str, saleCount: str });
export type RawSaleInfo = z.infer<typeof RawSaleInfo>;
export const RawSaleCountsResponse = z.looseObject({ ...envelope, saleInfo: z.record(z.string(), RawSaleInfo).default({}) });
