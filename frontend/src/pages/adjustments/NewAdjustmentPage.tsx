import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Product, Location, StockItem } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatQuantity } from '../../utils/formatters';

export const NewAdjustmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [productId, setProductId] = useState<number | ''>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [countedQty, setCountedQty] = useState<number | ''>('');
  const [reason, setReason] = useState('Damaged goods during inspection');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodList, locList, stockList] = await Promise.all([
          api.getProducts(),
          api.getLocations(),
          api.getStock(),
        ]);
        setProducts(prodList);
        setLocations(locList);
        setStocks(stockList);
        if (prodList.length > 0) setProductId(prodList[0].id);
        if (locList.length > 0) setLocationId(locList[0].id);
      } catch (err: any) {
        setError(err.message || 'Failed to load options');
      }
    };
    loadData();
  }, []);

  // Determine current system stock for selected product and location
  const currentStockItem = stocks.find(
    (s) => s.product_id === Number(productId) && s.location_id === Number(locationId)
  );
  const currentQty = currentStockItem ? currentStockItem.quantity : 0;
  const difference =
    countedQty !== '' ? Number(countedQty) - currentQty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !locationId) {
      setError('Please select both a product and a warehouse location.');
      return;
    }
    if (countedQty === '' || Number(countedQty) < 0) {
      setError('Please enter a valid non-negative physical count.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.createAdjustment({
        product_id: Number(productId),
        location_id: Number(locationId),
        counted_quantity: Number(countedQty),
        reason,
      });
      navigate('/adjustments');
    } catch (err: any) {
      setError(err.message || 'Failed to apply adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="New Stock Adjustment"
        description="Reconcile recorded inventory with actual on-hand stock counts."
        breadcrumbs={[
          { label: 'Adjustments', href: '/adjustments' },
          { label: 'New Adjustment' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/adjustments')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Cancel
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader title="Count Details" />
          <CardBody className="space-y-4">
            <Select
              label="Product to Count"
              required
              value={productId}
              onChange={(e) => setProductId(Number(e.target.value))}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} [${p.sku}]`,
              }))}
            />

            <Select
              label="Location / Rack"
              required
              value={locationId}
              onChange={(e) => setLocationId(Number(e.target.value))}
              options={locations.map((l) => ({
                value: l.id,
                label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
              }))}
            />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Current System Quantity:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {currentQty}
              </span>
            </div>

            <Input
              label="New Counted Quantity (Physical Count)"
              type="number"
              min="0"
              step="any"
              required
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder={`e.g. ${currentQty}`}
            />

            {countedQty !== '' && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between font-medium ${
                  difference === 0
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : difference > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>Adjustment Discrepancy:</span>
                <span className="font-mono font-bold">
                  {difference > 0 ? `+${difference}` : difference} units
                </span>
              </div>
            )}

            <Select
              label="Adjustment Reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              options={[
                { value: 'Damaged goods during inspection', label: 'Damaged goods during inspection' },
                { value: 'Routine physical inventory cycle count', label: 'Routine physical inventory cycle count' },
                { value: 'Lost or unaccounted items', label: 'Lost or unaccounted items' },
                { value: 'Unrecorded inbound shipment', label: 'Unrecorded inbound shipment' },
                { value: 'Expired stock write-off', label: 'Expired stock write-off' },
              ]}
            />
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/adjustments')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Commit Adjustment
          </Button>
        </div>
      </form>
    </div>
  );
};
