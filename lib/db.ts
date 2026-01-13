import Dexie, { Table } from 'dexie';
import { Product } from '@/types/product';

class ProductsDatabase extends Dexie {
  products!: Table<Product, number>;

  constructor() {
    super('ProductsDatabase');
    this.version(1).stores({
      products: '++id, purchasedAt, productCode, name, price',
    });
  }
}

export const db = new ProductsDatabase();
