"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Card,
  Alert,
} from "react-bootstrap";
import { db } from "@/lib/db";
import { Product, SortOrder, getCurrencySymbol } from "@/types/product";
import { blobToDataUrl } from "@/utils/imageUtils";
import ProductModal from "@/components/ProductModal";
import ProductTable from "@/components/ProductTable";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("purchasedAtDesc");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 商品を読み込む
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const allProducts = await db.products.toArray();

      // BlobをData URLに変換
      const productsWithUrls = await Promise.all(
        allProducts.map(async (product) => {
          if (product.image && product.image instanceof Blob) {
            const imageUrl = await blobToDataUrl(product.image);
            return { ...product, imageUrl };
          }
          return product;
        })
      );

      setProducts(productsWithUrls);
    } catch (error) {
      console.error("Error loading products:", error);
      alert("商品の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // フィルタリング・ソート・検索を適用
  useEffect(() => {
    // フィルタリングが変更されたら選択状態をクリア
    setSelectedIds(new Set());

    let filtered = [...products];

    // 検索（商品番号と商品名の部分一致）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.productCode.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query)
      );
    }

    // 日付フィルタ
    if (dateFrom) {
      filtered = filtered.filter((p) => p.purchasedAt >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((p) => p.purchasedAt <= dateTo);
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case "purchasedAtDesc":
          return b.purchasedAt.localeCompare(a.purchasedAt);
        case "priceAsc":
          return a.price - b.price;
        case "priceDesc":
          return b.price - a.price;
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, dateFrom, dateTo, sortOrder]);

  // 商品を保存
  const handleSave = async (productData: Omit<Product, "id" | "imageUrl">) => {
    try {
      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, productData);
      } else {
        await db.products.add(productData);
      }
      await loadProducts();
      setEditingProduct(undefined);
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    }
  };

  // 商品を編集
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  // 商品を削除
  const handleDelete = async (id: number) => {
    try {
      await db.products.delete(id);
      // 選択状態からも削除
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      await loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("削除に失敗しました");
    }
  };

  // 複数商品を削除
  const handleDeleteMultiple = async () => {
    if (selectedIds.size === 0) {
      alert("削除する商品を選択してください");
      return;
    }

    if (!confirm(`${selectedIds.size}件の商品を削除しますか？`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => db.products.delete(id))
      );
      setSelectedIds(new Set());
      await loadProducts();
    } catch (error) {
      console.error("Error deleting products:", error);
      alert("削除に失敗しました");
    }
  };

  // 商品の選択状態を変更
  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  // 全選択/全解除
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(
        filteredProducts
          .map((p) => p.id)
          .filter((id): id is number => id !== undefined)
      );
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(undefined);
  };

  // モーダルを開く（新規追加）
  const handleAddNew = () => {
    setEditingProduct(undefined);
    setShowModal(true);
  };

  // JSONエクスポート
  const handleExportJSON = async () => {
    try {
      const allProducts = await db.products.toArray();
      const exportData = await Promise.all(
        allProducts.map(async (product) => {
          const data: {
            id?: number;
            purchasedAt: string;
            productCode: string;
            name: string;
            price: number;
            quantity?: number;
            currency?: string;
            image?: string;
          } = {
            id: product.id,
            purchasedAt: product.purchasedAt,
            productCode: product.productCode,
            name: product.name,
            price: product.price,
            quantity: product.quantity,
            currency: product.currency || "JPY",
          };
          if (product.image) {
            data.image = await blobToDataUrl(product.image);
          }
          return data;
        })
      );

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      alert("エクスポートに失敗しました");
    }
  };

  // JSONインポート
  const handleImportJSON = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!Array.isArray(importData)) {
        alert("無効なJSON形式です");
        return;
      }

      const mode = confirm(
        "上書きモードでインポートしますか？\n（OK: 上書き / キャンセル: 追加）"
      );

      if (mode) {
        // 上書きモード：すべて削除してから追加
        await db.products.clear();
      }

      // データを変換して追加
      for (const item of importData) {
        const productData: {
          purchasedAt: string;
          productCode: string;
          name: string;
          price: number;
          quantity?: number;
          currency?: string;
          image: Blob | null;
          id?: number;
        } = {
          purchasedAt: item.purchasedAt,
          productCode: item.productCode,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          currency: item.currency || "JPY",
          image: null,
        };

        // 画像データをBlobに変換（Data URL形式）
        if (item.image && typeof item.image === "string") {
          if (item.image.startsWith("data:")) {
            // Data URLからBlobに変換
            const response = await fetch(item.image);
            const blob = await response.blob();
            productData.image = blob;
          }
        }

        if (mode) {
          // 上書きモード：IDを保持
          if (item.id) {
            await db.products.add({ ...productData, id: item.id });
          } else {
            await db.products.add(productData);
          }
        } else {
          // 追加モード
          await db.products.add(productData);
        }
      }

      await loadProducts();
      alert("インポートが完了しました");
    } catch (error) {
      console.error("Error importing JSON:", error);
      alert("インポートに失敗しました");
    } finally {
      // ファイル入力のリセット
      event.target.value = "";
    }
  };

  // CSVエクスポート
  const handleExportCSV = async () => {
    try {
      const allProducts = await db.products.toArray();
      const headers = [
        "仕入れ日",
        "商品番号",
        "商品名",
        "個数",
        "価格",
        "通貨",
      ];
      const rows = allProducts.map((product) => {
        // 価格を文字列に変換（カンマを含む可能性があるためクォートで囲む）
        const priceStr = product.price.toLocaleString();
        return [
          product.purchasedAt,
          product.productCode,
          `"${product.name.replace(/"/g, '""')}"`, // CSVエスケープ
          product.quantity || "",
          `"${priceStr}"`, // 価格をクォートで囲む
          product.currency || "JPY",
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // BOMを追加してExcelで正しく表示されるようにする
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("CSVエクスポートに失敗しました");
    }
  };

  return (
    <Container fluid className="py-3 py-md-4 px-3 px-md-4">
      <Row>
        <Col>
          <h1 className="mb-3 mb-md-4 h3 h-md-2">仕入れ商品管理</h1>

          <Alert variant="info" className="small mb-3 mb-md-4">
            ⚠️
            このアプリはブラウザに保存されます。消える可能性があるのでExport推奨
          </Alert>

          {/* 操作ボタン */}
          <div className="mb-3 mb-md-4 d-flex flex-column flex-md-row flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={handleAddNew}
              className="w-100 w-md-auto"
              size="sm"
              style={{ maxWidth: "200px" }}
            >
              + 商品を追加
            </Button>
            <Button
              variant="success"
              onClick={handleExportJSON}
              className="w-100 w-md-auto"
              size="sm"
              style={{ maxWidth: "200px" }}
            >
              JSONエクスポート
            </Button>
            <label
              className="btn btn-success btn-sm mb-0 w-100 w-md-auto"
              style={{ maxWidth: "200px" }}
            >
              JSONインポート
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                style={{ display: "none" }}
              />
            </label>
            <Button
              variant="info"
              onClick={handleExportCSV}
              className="w-100 w-md-auto"
              size="sm"
              style={{ maxWidth: "200px" }}
            >
              CSVエクスポート
            </Button>
          </div>

          {/* 検索・フィルタ・ソート */}
          <Card className="mb-3 mb-md-4">
            <Card.Body className="p-3 p-md-4">
              <Row className="g-3">
                <Col xs={12} md={4}>
                  <Form.Label className="small fw-bold">
                    検索（商品番号・商品名）
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="sm"
                    className="md-size-normal"
                  />
                </Col>
                <Col xs={6} md={3}>
                  <Form.Label className="small fw-bold">開始日</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    size="sm"
                    className="md-size-normal"
                  />
                </Col>
                <Col xs={6} md={3}>
                  <Form.Label className="small fw-bold">終了日</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    size="sm"
                    className="md-size-normal"
                  />
                </Col>
                <Col xs={12} md={2}>
                  <Form.Label className="small fw-bold">並び替え</Form.Label>
                  <Form.Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    size="sm"
                    className="md-size-normal"
                  >
                    <option value="purchasedAtDesc">
                      仕入れ日（新しい順）
                    </option>
                    <option value="priceAsc">価格（安い順）</option>
                    <option value="priceDesc">価格（高い順）</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* 商品一覧 */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">読み込み中...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 mb-md-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <strong className="small">
                  表示件数: {filteredProducts.length}件
                  {selectedIds.size > 0 && (
                    <span className="text-primary ms-2">
                      （{selectedIds.size}件選択中）
                    </span>
                  )}
                </strong>
                {selectedIds.size > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteMultiple}
                    className="w-100 w-md-auto"
                  >
                    選択した商品を削除 ({selectedIds.size})
                  </Button>
                )}
              </div>
              <ProductTable
                products={filteredProducts}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </>
          )}

          {/* モーダル */}
          <ProductModal
            show={showModal}
            onHide={handleCloseModal}
            onSave={handleSave}
            product={editingProduct}
          />
        </Col>
      </Row>
    </Container>
  );
}
