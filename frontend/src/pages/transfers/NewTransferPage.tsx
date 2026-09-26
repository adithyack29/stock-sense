import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { Product, Location, Warehouse, Stock } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatQuantity } from '../../utils/formatters';

interface LineItemInput {
  product_id: number;
  quantity: number;
}

export const NewTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);

  // Source selection
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | ''>('');
  const [sourceLocationId, setSourceLocationId] = useState<number | ''>('');

  // Destination selection
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<number | ''>('');
  const [destinationLocationId, setDestinationLocationId] = useState<number | ''>('');

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [prodList, locList, whList, stockList] = await Promise.all([
          api.getProducts(),
          api.getLocations(),
          api.getWarehouses(),
          api.getStock(),
        ]);
        setProducts(prodList);
        setLocations(locList);
        setWarehouses(whList);
        setStocks(stockList);

        if (locList.length >= 2) {
          const srcLoc = locList[0];
          const dstLoc = locList[1];
          setSourceLocationId(srcLoc.id);
          setSourceWarehouseId(srcLoc.warehouse_id);
          setDestinationLocationId(dstLoc.id);
          setDestinationWarehouseId(dstLoc.warehouse_id);
        } else if (locList.length === 1) {
          setSourceLocationId(locList[0].id);
          setSourceWarehouseId(locList[0].warehouse_id);
        }

        if (prodList.length > 0) {
          setItems([{ product_id: prodList[0].id, quantity: 10 }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load options');
      }
    };
    loadPrerequisites();
  }, []);

  // Filter locations by selected warehouse
  const filteredSourceLocations = sourceWarehouseId
    ? locations.filter((l) => l.warehouse_id === Number(sourceWarehouseId))
    : locations;

  // Filter destination locations by selected warehouse and exclude selected source location
  const filteredDestinationLocations = (
    destinationWarehouseId
      ? locations.filter((l) => l.warehouse_id === Number(destinationWarehouseId))
      : locations
  ).filter((l) => l.id !== Number(sourceLocationId));

  const handleSourceWarehouseChange = (whId: number | '') => {
    setSourceWarehouseId(whId);
    const locsInWh = whId ? locations.filter((l) => l.warehouse_id === Number(whId)) : locations;
    if (locsInWh.length > 0) {
      setSourceLocationId(locsInWh[0].id);
    } else {
      setSourceLocationId('');
    }
  };

  const handleDestinationWarehouseChange = (whId: number | '') => {
    setDestinationWarehouseId(whId);
    const locsInWh = (
      whId ? locations.filter((l) => l.warehouse_id === Number(whId)) : locations
    ).filter((l) => l.id !== Number(sourceLocationId));
    if (locsInWh.length > 0) {
      setDestinationLocationId(locsInWh[0].id);
    } else {
      setDestinationLocationId('');
    }
  };

  const getSourceStock = (productId: number): number => {
    if (!sourceLocationId) return 0;
    const match = stocks.find(
      (s) => s.product_id === productId && s.location_id === Number(sourceLocationId)
    );
    return match ? match.quantity : 0;
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    const usedIds = new Set(items.map((i) => i.product_id));
    const nextProd = products.find((p) => !usedIds.has(p.id)) || products[0];
    setItems([...items, { product_id: nextProd.id, quantity: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('A transfer must have at least one line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItemInput, val: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setItems(updated);
  };

  // Check duplicate product IDs
  const duplicateProductIds = items
    .map((i) => i.product_id)
    .filter((id, index, arr) => arr.indexOf(id) !== index);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!sourceLocationId) {
      errors.sourceLocationId = 'Source location is required.';
    }
    if (!destinationLocationId) {
      errors.destinationLocationId = 'Destination location is required.';
    }
    if (sourceLocationId && destinationLocationId && sourceLocationId === destinationLocationId) {
      errors.destinationLocationId = 'Source and destination locations must be different.';
    }
    if (items.length === 0) {
      errors.items = 'Please add at least one line item to the transfer.';
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].quantity || items[i].quantity <= 0) {
        errors[`item_${i}_qty`] = 'Quantity must be strictly greater than zero.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitTransfer = async (targetStatus: 'draft' | 'ready') => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await api.createTransfer({
        source_location_id: Number(sourceLocationId),
        destination_location_id: Number(destinationLocationId),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        notes: notes.trim() || undefined,
        status: targetStatus,
        items,
      });
      navigate(`/transfers/${created.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create transfer order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Create Internal Stock Transfer"
        description="Schedule relocation of goods between warehouse bays or across facilities. Total company stock remains unchanged."
        breadcrumbs={[
          { label: 'Transfers', href: '/transfers' },
          { label: 'New Transfer' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/transfers')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Cancel
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {duplicateProductIds.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Notice: Duplicate products will be automatically aggregated into combined quantities.</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Route / Locations Card */}
        <Card>
          <CardHeader
            title="Transfer Route"
            subtitle="Select source origin and target destination"
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/60 rounded-xl border border-slate-200/80">
              {/* Origin Selection */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Origin (Source)
                </span>
                <Select
                  label="Source Warehouse"
                  value={sourceWarehouseId}
                  onChange={(e) =>
                    handleSourceWarehouseChange(e.target.value ? Number(e.target.value) : '')
                  }
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.name} [${w.short_code}]`,
                  }))}
                />
                <Select
                  label="Source Bay / Rack"
                  required
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(Number(e.target.value))}
                  options={filteredSourceLocations.map((l) => ({
                    value: l.id,
                    label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
                  }))}
                />
                {fieldErrors.sourceLocationId && (
                  <p className="text-[11px] text-rose-600">{fieldErrors.sourceLocationId}</p>
                )}
              </div>

              {/* Destination Selection */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">
                  Destination (Target)
                </span>
                <Select
                  label="Destination Warehouse"
                  value={destinationWarehouseId}
                  onChange={(e) =>
                    handleDestinationWarehouseChange(e.target.value ? Number(e.target.value) : '')
                  }
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.name} [${w.short_code}]`,
                  }))}
                />
                <Select
                  label="Destination Bay / Rack"
                  required
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(Number(e.target.value))}
                  options={filteredDestinationLocations.map((l) => ({
                    value: l.id,
                    label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
                  }))}
                />
                {fieldErrors.destinationLocationId && (
                  <p className="text-[11px] text-rose-600">{fieldErrors.destinationLocationId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Scheduled Transfer Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <Input
                label="Transfer Purpose / Reference Note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Relocate steel rods to production floor for fabrication"
              />
            </div>
          </CardBody>
        </Card>

        {/* Line Items Card */}
        <Card>
          <CardHeader
            title={`Items to Relocate (${items.length})`}
            subtitle="Stock to be deducted from origin and credited to destination"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Product
              </Button>
            }
          />
          <CardBody className="space-y-4">
            {items.map((item, index) => {
              const prod = products.find((p) => p.id === item.product_id);
              const available = getSourceStock(item.product_id);
              const uom = prod?.unit_of_measure || 'units';
              const remaining = available - item.quantity;
              const isOverStock = item.quantity > available;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all ${
                    isOverStock
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50/70 border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <Select
                        label={`Line Item #${index + 1} Product`}
                        value={item.product_id}
                        onChange={(e) =>
                          handleItemChange(index, 'product_id', parseInt(e.target.value, 10))
                        }
                        options={products.map((p) => ({
                          value: p.id,
                          label: `${p.name} [${p.sku}]`,
                        }))}
                      />
                    </div>

                    <div className="w-full sm:w-36">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Qty ({uom})
                        </label>
                      </div>
                      <Input
                        type="number"
                        min="0.1"
                        step="any"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'quantity',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    {items.length > 1 && (
                      <div className="flex justify-end sm:justify-start">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 mb-0.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Source Stock Display */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-slate-500 font-medium">Available at Source: </span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                            available > 0
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {formatQuantity(available, uom)}
                        </span>
                      </div>

                      {!isOverStock && (
                        <div>
                          <span className="text-slate-500 font-medium">Remaining after transfer: </span>
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {formatQuantity(remaining, uom)}
                          </span>
                        </div>
                      )}
                    </div>

                    {isOverStock ? (
                      <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Only {formatQuantity(available, uom)} available at this location.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Sufficient source stock</span>
                      </div>
                    )}
                  </div>

                  {fieldErrors[`item_${index}_qty`] && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      {fieldErrors[`item_${index}_qty`]}
                    </p>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/transfers')}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => submitTransfer('draft')}
              isLoading={isSubmitting}
              className="w-full sm:w-auto"
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => submitTransfer('ready')}
              isLoading={isSubmitting}
              className="w-full sm:w-auto"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Save & Mark Ready
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
