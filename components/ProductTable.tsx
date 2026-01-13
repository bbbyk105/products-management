'use client';

import { Table, Button, ButtonGroup, Card, Form } from 'react-bootstrap';
import { Product, getCurrencySymbol } from '@/types/product';

interface ProductTableProps {
  products: Product[];
  selectedIds: Set<number>;
  onSelect: (id: number, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export default function ProductTable({ 
  products, 
  selectedIds, 
  onSelect, 
  onSelectAll, 
  onEdit, 
  onDelete 
}: ProductTableProps) {
  const handleDelete = (id: number) => {
    if (confirm('この商品を削除しますか？')) {
      onDelete(id);
    }
  };

  const allSelected = products.length > 0 && products.every(p => p.id && selectedIds.has(p.id));
  const someSelected = products.some(p => p.id && selectedIds.has(p.id));

  // スマホ表示（カード形式）
  const MobileCardView = () => (
    <div className="d-md-none">
      {products.length === 0 ? (
        <div className="text-center text-muted py-4">
          商品がありません
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {products.map((product) => {
            const currencySymbol = getCurrencySymbol(product.currency);
            const isSelected = product.id ? selectedIds.has(product.id) : false;
            return (
              <Card key={product.id}>
                <Card.Body className="p-3">
                  <div className="d-flex align-items-start gap-2 mb-2">
                    <Form.Check
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => product.id && onSelect(product.id, e.target.checked)}
                      className="mt-1"
                    />
                  </div>
                  <div className="d-flex gap-3 mb-3">
                    <div style={{ flexShrink: 0 }}>
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
                            fontSize: '10px',
                            color: '#6c757d',
                            borderRadius: '4px',
                          }}
                        >
                          画像なし
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fw-bold mb-1 text-truncate">{product.name}</div>
                      <div className="small text-muted mb-1">商品番号: {product.productCode}</div>
                      <div className="small text-muted mb-1">仕入れ日: {product.purchasedAt}</div>
                      {product.quantity && (
                        <div className="small text-muted mb-1">個数: {product.quantity}</div>
                      )}
                      <div className="fw-bold text-primary">
                        {currencySymbol}{product.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                <div className="d-grid gap-2 d-md-flex">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => onEdit(product)}
                    className="flex-fill"
                  >
                    編集
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(product.id!)}
                    className="flex-fill"
                  >
                    削除
                  </Button>
                </div>
              </Card.Body>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // PC表示（テーブル形式）
  const DesktopTableView = () => (
    <div className="d-none d-md-block">
      <div className="table-responsive">
        <Table striped bordered hover className="align-middle mb-0">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>
                <Form.Check
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ width: '100px' }}>写真</th>
              <th>仕入れ日</th>
              <th>商品番号</th>
              <th>商品名</th>
              <th>個数</th>
              <th>価格</th>
              <th style={{ width: '150px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  商品がありません
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const currencySymbol = getCurrencySymbol(product.currency);
                const isSelected = product.id ? selectedIds.has(product.id) : false;
                return (
                  <tr key={product.id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => product.id && onSelect(product.id, e.target.checked)}
                      />
                    </td>
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
                            borderRadius: '4px',
                          }}
                        >
                          画像なし
                        </div>
                      )}
                    </td>
                    <td>{product.purchasedAt}</td>
                    <td>{product.productCode}</td>
                    <td>{product.name}</td>
                    <td>{product.quantity || '-'}</td>
                    <td>{currencySymbol}{product.price.toLocaleString()}</td>
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
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />
    </>
  );
}
