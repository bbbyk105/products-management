'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Product } from '@/types/product';
import { resizeAndCompressImage } from '@/utils/imageUtils';

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
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        purchasedAt: product.purchasedAt,
        productCode: product.productCode,
        name: product.name,
        price: product.price.toString(),
      });
      if (product.imageUrl) {
        setImagePreview(product.imageUrl);
      }
    } else {
      resetForm();
    }
  }, [product, show]);

  const resetForm = () => {
    setFormData({
      purchasedAt: new Date().toISOString().split('T')[0],
      productCode: '',
      name: '',
      price: '',
    });
    setImageFile(null);
    setImagePreview('');
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

      await onSave({
        purchasedAt: formData.purchasedAt,
        productCode: formData.productCode,
        name: formData.name,
        price: parseFloat(formData.price),
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
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{product ? '商品を編集' : '商品を追加'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>写真</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                  className="img-thumbnail"
                />
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>仕入れ日</Form.Label>
            <Form.Control
              type="date"
              value={formData.purchasedAt}
              onChange={(e) => setFormData({ ...formData, purchasedAt: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>商品番号</Form.Label>
            <Form.Control
              type="text"
              value={formData.productCode}
              onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>商品名</Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>価格（円）</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            キャンセル
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
