import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Scale, CheckCircle2, FileText } from 'lucide-react';
import { api } from '../../api';
import { Product, Location, Stock } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatQuantity } from '../../utils/formatters';

const REASON_OPTIONS = [
  { value: 'Stock Count Correction', label: 'Stock Count Correction' },
  { value: 'Damaged Goods', label: 'Damaged Goods' },
  { value: 'Lost Inventory', label: 'Lost Inventory' },
  { value: 'Found Inventory', label: 'Found Inventory' },
  { value: 'Warehouse Reconciliation', label: 'Warehouse Reconciliation' },
  { value: 'Data Entry Correction', label: 'Data Entry Correction' },
  { value: 'Expired Goods Write-off', label: 'Expired Goods Write-off' },
  { value: 'Other', label: 'Other (Specify in Notes)' },
];

export const NewAdjustmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);

  const [productId, setProductId] = useState<number | ''>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [countedQty, setCountedQty] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('Stock Count Correction');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state for direct validation
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

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
        setError(err.message || 'Failed to load master inventory data.');
      }
    };
    loadData();
  }, []);

  // Selected product & location metadata
  const selectedProduct = products.find((p) => p.id === Number(productId));
  const selectedLocation = locations.find((l) => l.id === Number(locationId));
  const uom = selectedProduct?.unit_of_measure || 'pcs';

  // Determine current system stock for selected product and location
  const currentStockItem = stocks.find(
    (s) => s.product_id === Number(productId) && s.location_id === Number(locationId)
  );
  const systemQty = currentStockItem ? currentStockItem.quantity : 0;

  // Live difference and new stock calculations
  const hasCount = countedQty !== '';
  const parsedCount = hasCount ? Number(countedQty) : 0;
  const difference = hasCount ? parsedCount - systemQty : 0;
  const newStock = hasCount ? parsedCount : systemQty;

  const isPositive = difference > 0;
  const isNegative = difference < 0;
  const isZero = difference === 0;

  const validateInputs = (): boolean => {
    if (!productId || !locationId) {
      setError('Please select both a Product and a Location.');
      return false;
    }
    if (countedQty === '' || isNaN(Number(countedQty))) {
      setError('Please enter a valid physical count.');
      return false;
    }
    if (Number(countedQty) < 0) {
      setError('Physical count must be greater than or equal to 0 (negative stock is not permitted).');
      return false;
    }
    if (!reason.trim()) {
      setError('Please specify an adjustment reason.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreate = async (status: 'draft' | 'done') => {
    if (!validateInputs()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.createAdjustment({
        product_id: Number(productId),
        location_id: Number(locationId),
        counted_quantity: Number(countedQty),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        status: status,
      });
      navigate(`/adjustments/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create stock adjustment.');
    } finally {
      setIsSubmitting(false);
      setIsConfirmDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="New Stock Adjustment"
        description="Physical count inventory reconciliation. Compares counted inventory with system stock and logs discrepancies."
        breadcrumbs={[
          { label: 'Stock Adjustments', href: '/adjustments' },
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

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader
            title="Physical Count Details"
            subtitle="Select the product and location, enter the verified physical count, and provide justification."
          />
          <CardBody className="space-y-5">
            {/* Product & Location Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Product to Reconcile"
                required
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.name} [${p.sku}]`,
                }))}
              />

              <Select
                label="Warehouse Location / Rack"
                required
                value={locationId}
                onChange={(e) => setLocationId(Number(e.target.value))}
                options={locations.map((l) => ({
                  value: l.id,
                  label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
                }))}
              />
            </div>

            {/* Live Calculation Display Box */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Current System Qty (Read-only) */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  Current System Stock
                </span>
                <span className="font-mono text-lg font-bold text-slate-800 block">
                  {formatQuantity(systemQty, uom)}
                </span>
                <span className="text-[10px] text-slate-400 block">System record</span>
              </div>

              {/* Physical Count */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  Physical Count
                </span>
                <span className="font-mono text-lg font-bold text-indigo-700 block">
                  {hasCount ? formatQuantity(parsedCount, uom) : '—'}
                </span>
                <span className="text-[10px] text-slate-400 block">Counted input</span>
              </div>

              {/* Live Calculated Difference */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  Adjustment Variance
                </span>
                <span
                  className={`font-mono text-lg font-bold block ${
                    !hasCount
                      ? 'text-slate-400'
                      : isPositive
                      ? 'text-emerald-700'
                      : isNegative
                      ? 'text-rose-700'
                      : 'text-slate-700'
                  }`}
                >
                  {hasCount ? (isPositive ? `+${difference} ${uom}` : `${difference} ${uom}`) : '—'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {hasCount
                    ? isPositive
                      ? 'Surplus (+)'
                      : isNegative
                      ? 'Deficit (-)'
                      : 'Exact match'
                    : 'Difference'}
                </span>
              </div>

              {/* Live Calculated New Stock */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1">
                  Resulting System Stock
                </span>
                <span className="font-mono text-lg font-bold text-slate-900 block">
                  {formatQuantity(newStock, uom)}
                </span>
                <span className="text-[10px] text-slate-400 block">After validation</span>
              </div>
            </div>

            {/* Input Physical Count */}
            <div>
              <Input
                label="Physical Count (Actual On-Hand Quantity)"
                type="number"
                min="0"
                step="any"
                required
                value={countedQty}
                onChange={(e) =>
                  setCountedQty(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder={`e.g. ${systemQty}`}
                helperText={`Enter the physically verified quantity. System stock is currently ${formatQuantity(
                  systemQty,
                  uom
                )}.`}
              />
            </div>

            {/* Reason Selector */}
            <Select
              label="Adjustment Reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              options={REASON_OPTIONS}
            />

            {/* Free-text Audit Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Notes / Justification (Optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 3 steel rods damaged during unloading from supplier delivery."
                className="w-full text-xs rounded-lg border border-slate-200 p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-2xs"
              />
            </div>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/adjustments')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCreate('draft')}
              isLoading={isSubmitting}
              className="w-full sm:w-auto"
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (validateInputs()) {
                  setIsConfirmDialogOpen(true);
                }
              }}
              isLoading={isSubmitting}
              className="w-full sm:w-auto"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Apply Adjustment
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Dialog before applying */}
      {selectedProduct && selectedLocation && (
        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          title="Confirm Stock Adjustment"
          message={`Adjust ${selectedProduct.name} at ${selectedLocation.name} from ${systemQty} ${uom} to ${
            countedQty !== '' ? countedQty : 0
          } ${uom}? This will update current stock immediately.`}
          confirmLabel="Confirm Adjustment"
          cancelLabel="Cancel"
          variant="primary"
          isLoading={isSubmitting}
          onConfirm={() => handleCreate('done')}
          onClose={() => setIsConfirmDialogOpen(false)}
        />
      )}
    </div>
  );
};
