'use client';

import { Table, Button, ButtonGroup } from 'react-bootstrap';
import { Product } from '@/types/product';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export default function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  const handleDelete = (id: number) => {
    if (confirm('この商品を削除しますか？')) {
      onDelete(id);
    }
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover className="align-middle">
        <thead>
          <tr>
            <th style={{ width: '100px' }}>写真</th>
            <th>仕入れ日</th>
            <th>商品番号</th>
            <th>商品名</th>
            <th>価格</th>
            <th style={{ width: '150px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted">
                商品がありません
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                      className="img-thumbnail"
                    />
                  ) : (
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: '#f8f9fa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#6c757d',
                      }}
                    >
                      画像なし
                    </div>
                  )}
                </td>
                <td>{product.purchasedAt}</td>
                <td>{product.productCode}</td>
                <td>{product.name}</td>
                <td>¥{product.price.toLocaleString()}</td>
                <td>
                  <ButtonGroup size="sm">
                    <Button variant="outline-primary" onClick={() => onEdit(product)}>
                      編集
                    </Button>
                    <Button variant="outline-danger" onClick={() => handleDelete(product.id!)}>
                      削除
                    </Button>
                  </ButtonGroup>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
