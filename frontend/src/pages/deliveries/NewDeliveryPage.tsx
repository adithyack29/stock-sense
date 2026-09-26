import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../api';
import { Product, Location, Stock } from '../../types';
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

export const NewDeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [customer, setCustomer] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [prodList, locList, stockList] = await Promise.all([
          api.getProducts(),
          api.getLocations(),
          api.getStock(),
        ]);
        setProducts(prodList);
        setLocations(locList);
        setStocks(stockList);
        if (locList.length > 0) setSourceLocationId(locList[0].id);
        if (prodList.length > 0) {
          setItems([{ product_id: prodList[0].id, quantity: 5 }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load options');
      }
    };
    loadPrerequisites();
  }, []);

  const getAvailableStock = (productId: number, locationId: number | ''): number => {
    if (!locationId) return 0;
    const match = stocks.find(
      (s) => s.product_id === productId && s.location_id === Number(locationId)
    );
    return match ? match.quantity : 0;
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    const usedIds = new Set(items.map((i) => i.product_id));
    const nextProd = products.find((p) => !usedIds.has(p.id)) || products[0];
    setItems([...items, { product_id: nextProd.id, quantity: 5 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('A delivery order must have at least one line item.');
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

  // Check for duplicate products
  const duplicateProductIds = items
    .map((i) => i.product_id)
    .filter((id, index, arr) => arr.indexOf(id) !== index);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!customer.trim()) {
      errors.customer = 'Customer / recipient name is required.';
    }
    if (!sourceLocationId) {
      errors.sourceLocationId = 'Source warehouse dispatch location is required.';
    }
    if (items.length === 0) {
      errors.items = 'Please add at least one product line item.';
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].quantity || items[i].quantity <= 0) {
        errors[`item_${i}_qty`] = 'Quantity must be strictly greater than zero.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitDelivery = async (targetStatus: 'draft' | 'ready') => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await api.createDelivery({
        customer: customer.trim(),
        source_location_id: Number(sourceLocationId),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        notes: notes.trim() || undefined,
        status: targetStatus,
        items,
      });
      navigate(`/deliveries/${created.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create delivery order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Create Outbound Delivery"
        description="Schedule a customer shipment order. Save as Draft for planning, or mark Ready for dispatch."
        breadcrumbs={[
          { label: 'Deliveries', href: '/deliveries' },
          { label: 'New Delivery' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/deliveries')}
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
          <span>Notice: Duplicate products will be automatically merged into combined quantities.</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <Card>
          <CardHeader
            title="General Order Information"
            subtitle="Customer details and source dispatch location"
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Customer / Destination"
                  required
                  value={customer}
                  onChange={(e) => {
                    setCustomer(e.target.value);
                    if (fieldErrors.customer) {
                      setFieldErrors((prev) => ({ ...prev, customer: '' }));
                    }
                  }}
                  placeholder="e.g. ABC Manufacturing Ltd."
                />
                {fieldErrors.customer && (
                  <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.customer}</p>
                )}
              </div>

              <div>
                <Select
                  label="Source Warehouse Bay / Rack"
                  required
                  value={sourceLocationId}
                  onChange={(e) => {
                    setSourceLocationId(Number(e.target.value));
                    if (fieldErrors.sourceLocationId) {
                      setFieldErrors((prev) => ({ ...prev, sourceLocationId: '' }));
                    }
                  }}
                  options={locations.map((l) => ({
                    value: l.id,
                    label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
                  }))}
                />
                {fieldErrors.sourceLocationId && (
                  <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.sourceLocationId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Scheduled Fulfillment Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <Input
                label="Shipping / Carrier Instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ship via Priority Freight carrier #4, dock 2"
              />
            </div>
          </CardBody>
        </Card>

        {/* Line Items Card */}
        <Card>
          <CardHeader
            title={`Items to Deliver (${items.length})`}
            subtitle="Products to be picked and deducted from the source location"
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
              const available = getAvailableStock(item.product_id, sourceLocationId);
              const uom = prod?.unit_of_measure || 'units';
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

                  {/* Stock Availability Indicator */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">On-hand at location:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          available > 0
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {formatQuantity(available, uom)}
                      </span>
                    </div>

                    {isOverStock ? (
                      <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Only {formatQuantity(available, uom)} available at this location.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Sufficient stock available</span>
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
            onClick={() => navigate('/deliveries')}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => submitDelivery('draft')}
              isLoading={isSubmitting}
              className="w-full sm:w-auto"
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => submitDelivery('ready')}
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
