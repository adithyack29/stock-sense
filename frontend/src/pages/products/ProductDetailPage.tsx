import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Boxes, History, Edit2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Product, StockItem, StockMovement } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Badge, MovementBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
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

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: 'Raw Materials',
    unit_of_measure: 'kg',
    reorder_level: 10,
  });

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/products')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Catalog
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditFormData({
                  name: product.name,
                  category: product.category,
                  unit_of_measure: product.unit_of_measure,
                  reorder_level: product.reorder_level,
                });
                setIsEditModalOpen(true);
              }}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              Edit Specs & Rules
            </Button>
          </div>
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

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product & Reordering Rules"
        subtitle={`Update specifications and threshold alerts for ${product.name}`}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  setIsSubmitting(true);
                  setEditError(null);
                  const updated = await api.updateProduct(product.id, editFormData);
                  setProduct(updated);
                  setIsEditModalOpen(false);
                } catch (err: any) {
                  setEditError(err.message || 'Failed to update product');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              isLoading={isSubmitting}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setIsSubmitting(true);
              setEditError(null);
              const updated = await api.updateProduct(product.id, editFormData);
              setProduct(updated);
              setIsEditModalOpen(false);
            } catch (err: any) {
              setEditError(err.message || 'Failed to update product');
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="space-y-4"
        >
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Product Name"
            required
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={editFormData.category}
              onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
              options={[
                { value: 'Raw Materials', label: 'Raw Materials' },
                { value: 'Building Supplies', label: 'Building Supplies' },
                { value: 'Furniture', label: 'Furniture' },
                { value: 'Electrical', label: 'Electrical' },
                { value: 'Plumbing', label: 'Plumbing' },
                { value: 'General', label: 'General' },
              ]}
            />

            <Select
              label="Unit of Measure (UoM)"
              value={editFormData.unit_of_measure}
              onChange={(e) => setEditFormData({ ...editFormData, unit_of_measure: e.target.value })}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'bags', label: 'Bags' },
                { value: 'units', label: 'Units / Pieces' },
                { value: 'rolls', label: 'Rolls' },
                { value: 'meters', label: 'Meters' },
                { value: 'sheets', label: 'Sheets' },
              ]}
            />
          </div>

          <Input
            label="Min Reorder Warning Threshold"
            type="number"
            min="0"
            required
            value={editFormData.reorder_level}
            onChange={(e) =>
              setEditFormData({
                ...editFormData,
                reorder_level: parseFloat(e.target.value) || 0,
              })
            }
          />
        </form>
      </Modal>
    </div>
  );
};
