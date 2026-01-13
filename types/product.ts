export interface Product {
  id?: number;
  purchasedAt: string; // YYYY-MM-DD
  productCode: string;
  name: string;
  price: number;
  image: Blob | null;
  imageUrl?: string; // 表示用のURL（Blobから生成）
}

export type SortOrder = 'purchasedAtDesc' | 'priceAsc' | 'priceDesc';
