'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Product, CURRENCIES } from '@/types/product';
import { resizeAndCompressImage } from '@/utils/imageUtils';
import { db } from '@/lib/db';

interface ProductModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (product: Omit<Product, 'id' | 'imageUrl'>) => Promise<void>;
  product?: Product;
}

export default function ProductModal({ show, onHide, onSave, product }: ProductModalProps) {
  const [formData, setFormData] = useState({
    purchasedAt: '',
    productCode: '',
    name: '',
    price: '',
    quantity: '',
    currency: 'JPY',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 商品番号を自動生成する関数
  const generateProductCode = useCallback(async (date: string) => {
    // 編集モードの場合はスキップ
    if (product) return;
    
    // 日付が入力されていない場合はスキップ
    if (!date) return;

    try {
      // 同じ日付の商品を取得
      const sameDateProducts = await db.products
        .where('purchasedAt')
        .equals(date)
        .toArray();

      if (sameDateProducts.length === 0) {
        // 同じ日付の商品がない場合は001から開始
        setFormData(prev => ({ ...prev, productCode: '001' }));
      } else {
        // 同じ日付の商品がある場合、最大の商品番号を取得
        const maxCode = sameDateProducts.reduce((max, p) => {
          const codeNum = parseInt(p.productCode) || 0;
          return Math.max(max, codeNum);
        }, 0);
        
        // 次の番号を生成（3桁ゼロパディング）
        const nextCode = String(maxCode + 1).padStart(3, '0');
        setFormData(prev => ({ ...prev, productCode: nextCode }));
      }
    } catch (error) {
      console.error('Error generating product code:', error);
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      setFormData({
        purchasedAt: product.purchasedAt,
        productCode: product.productCode,
        name: product.name,
        price: product.price.toString(),
        quantity: product.quantity?.toString() || '',
        currency: product.currency || 'JPY',
      });
      if (product.imageUrl) {
        setImagePreview(product.imageUrl);
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        purchasedAt: today,
        productCode: '',
        name: '',
        price: '',
        quantity: '',
        currency: 'JPY',
      });
      setImageFile(null);
      setImagePreview('');
      // 初期日付で商品番号を生成
      generateProductCode(today);
    }
  }, [product, show, generateProductCode]);

  // 日付が変更されたときに商品番号を自動生成
  useEffect(() => {
    if (!product && formData.purchasedAt) {
      generateProductCode(formData.purchasedAt);
    }
  }, [formData.purchasedAt, product, generateProductCode]);

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      purchasedAt: today,
      productCode: '',
      name: '',
      price: '',
      quantity: '',
      currency: 'JPY',
    });
    setImageFile(null);
    setImagePreview('');
    // 初期日付で商品番号を生成
    generateProductCode(today);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageBlob: Blob | null = null;

      if (imageFile) {
        imageBlob = await resizeAndCompressImage(imageFile);
      } else if (product?.image) {
        imageBlob = product.image;
      }

      // 商品番号を3桁ゼロパディングに正規化
      const normalizedProductCode = formData.productCode
        ? String(parseInt(formData.productCode) || 0).padStart(3, '0')
        : '001';

      await onSave({
        purchasedAt: formData.purchasedAt,
        productCode: normalizedProductCode,
        name: formData.name,
        price: parseFloat(formData.price),
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        currency: formData.currency,
        image: imageBlob,
      });

      resetForm();
      onHide();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" fullscreen="sm-down">
      <Modal.Header closeButton>
        <Modal.Title className="h5">{product ? '商品を編集' : '商品を追加'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-3 p-md-4">
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">写真</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              size="sm"
              className="md-size-normal"
            />
            {imagePreview && (
              <div className="mt-2 text-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                  className="img-thumbnail"
                />
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">仕入れ日・商品番号</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="date"
                value={formData.purchasedAt}
                onChange={(e) => setFormData({ ...formData, purchasedAt: e.target.value })}
                required
                size="sm"
                className="md-size-normal"
                style={{ flex: 1 }}
              />
              <Form.Control
                type="text"
                value={formData.productCode}
                readOnly
                size="sm"
                className="md-size-normal"
                style={{ flex: 1, backgroundColor: '#f8f9fa' }}
                placeholder="自動生成"
              />
            </div>
            <Form.Text className="text-muted small">
              日付を入力すると商品番号が自動生成されます
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">商品名</Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              size="sm"
              className="md-size-normal"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">個数</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              size="sm"
              className="md-size-normal"
              placeholder="任意"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">通貨</Form.Label>
            <Form.Select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              size="sm"
              className="md-size-normal"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">価格</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              size="sm"
              className="md-size-normal"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="p-3 p-md-4">
          <Button variant="secondary" onClick={onHide} disabled={loading} className="w-100 w-md-auto">
            キャンセル
          </Button>
          <Button variant="primary" type="submit" disabled={loading} className="w-100 w-md-auto">
            {loading ? '保存中...' : '保存'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
