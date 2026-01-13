export interface Product {
  id?: number;
  purchasedAt: string; // YYYY-MM-DD
  productCode: string;
  name: string;
  price: number;
  quantity?: number; // 個数
  currency?: string; // 通貨コード（JPY, USD, EURなど）
  image: Blob | ArrayBuffer | null; // IndexedDB保存用にArrayBufferも許可
  imageUrl?: string; // 表示用のURL（Blobから生成）
}

export type SortOrder = "purchasedAtDesc" | "priceAsc" | "priceDesc";

// 通貨の設定
export const CURRENCIES = [
  { code: "JPY", symbol: "¥", name: "日本円" },
  { code: "VND", symbol: "₫", name: "ベトナムドン" },
  { code: "USD", symbol: "$", name: "米ドル" },
  { code: "EUR", symbol: "€", name: "ユーロ" },
  { code: "GBP", symbol: "£", name: "英ポンド" },
  { code: "CNY", symbol: "¥", name: "中国元" },
] as const;

export const getCurrencySymbol = (currency?: string): string => {
  const currencyObj = CURRENCIES.find((c) => c.code === currency);
  return currencyObj?.symbol || "¥";
};
