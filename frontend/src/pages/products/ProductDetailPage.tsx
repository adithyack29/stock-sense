import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Boxes, History } from 'lucide-react';
import { api } from '../../api';
import { Product, StockItem, StockMovement } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Badge, MovementBadge } from '../../components/common/Badge';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatQuantity, formatDate } from '../../utils/formatters';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const [prodData, allStocks, movData] = await Promise.all([
          api.getProduct(parseInt(id, 10)),
          api.getStock(),
          api.getMovements({ product_id: parseInt(id, 10) }),
        ]);
        setProduct(prodData);
        setStocks(allStocks.filter((s) => s.product_id === parseInt(id, 10)));
        setMovements(movData);
      } catch (err: any) {
        setError(err.message || 'Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (isLoading) return <LoadingState message="Loading product records..." />;
  if (error || !product) {
    return (
      <ErrorState
        title="Product not found"
        message={error || 'Unable to locate product in system'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const isLowStock = (product.total_stock ?? 0) <= product.reorder_level;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} • Category: ${product.category}`}
        breadcrumbs={[
          { label: 'Products', href: '/products' },
          { label: product.sku },
        ]}
        badge={
          isLowStock ? (
            <Badge variant="waiting">Low Stock Alert</Badge>
          ) : (
            <Badge variant="done">In Stock</Badge>
          )
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Catalog
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info card */}
        <Card className="md:col-span-1">
          <CardHeader title="Product Specs" />
          <CardBody className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Item Code (SKU)</span>
              <span className="font-mono font-semibold text-slate-800">{product.sku}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Unit of Measure</span>
              <span className="font-medium text-slate-800">{product.unit_of_measure}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Reorder Warning Point</span>
              <span className="font-medium text-slate-800">
                {formatQuantity(product.reorder_level, product.unit_of_measure)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block">Aggregate Stock across All Warehouses</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {formatQuantity(product.total_stock ?? 0, product.unit_of_measure)}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Breakdown by warehouse/location */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Stock Distribution by Location"
              subtitle="Physical warehouse racking breakdown"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(s) => s.id}
                data={stocks}
                emptyText="No location stock recorded for this SKU yet."
                columns={[
                  {
                    key: 'warehouse_name',
                    header: 'Warehouse',
                    render: (s) => (
                      <span className="font-semibold text-slate-800">{s.warehouse_name}</span>
                    ),
                  },
                  {
                    key: 'location_name',
                    header: 'Specific Location / Rack',
                    render: (s) => (
                      <span className="text-slate-600 font-mono text-xs">{s.location_name}</span>
                    ),
                  },
                  {
                    key: 'quantity',
                    header: 'On-Hand Qty',
                    align: 'right',
                    render: (s) => (
                      <span className="font-bold font-mono text-slate-900">
                        {formatQuantity(s.quantity, s.unit_of_measure)}
                      </span>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>

          {/* Product Movement Ledger */}
          <Card>
            <CardHeader
              title="Stock Ledger Audit"
              subtitle="Chronological transaction log for this product"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(m) => m.id}
                data={movements}
                emptyText="No movements recorded yet."
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    render: (m) => formatDate(m.date),
                  },
                  {
                    key: 'reference',
                    header: 'Reference',
                    render: (m) => <span className="font-mono">{m.reference}</span>,
                  },
                  {
                    key: 'movement_type',
                    header: 'Type',
                    render: (m) => <MovementBadge type={m.movement_type} />,
                  },
                  {
                    key: 'quantity',
                    header: 'Qty Changed',
                    align: 'right',
                    render: (m) => (
                      <span className="font-mono font-semibold">
                        {formatQuantity(m.quantity, m.unit_of_measure)}
                      </span>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
