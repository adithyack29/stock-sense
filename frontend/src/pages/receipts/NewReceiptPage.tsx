import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import { Product, Location } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

interface LineItemInput {
  product_id: number;
  quantity: number;
}

export const NewReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [supplier, setSupplier] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [prodList, locList] = await Promise.all([api.getProducts(), api.getLocations()]);
        setProducts(prodList);
        setLocations(locList);
        if (locList.length > 0) setDestinationLocationId(locList[0].id);
        if (prodList.length > 0) {
          setItems([{ product_id: prodList[0].id, quantity: 10 }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load prerequisite data.');
      }
    };
    loadPrerequisites();
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    // Find first product not yet in items, or default to first
    const usedIds = new Set(items.map((i) => i.product_id));
    const nextProd = products.find((p) => !usedIds.has(p.id)) || products[0];
    setItems([...items, { product_id: nextProd.id, quantity: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('A receipt must have at least one line item.');
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

  // Check for duplicate product IDs in items
  const duplicateProductIds = items
    .map((i) => i.product_id)
    .filter((id, index, arr) => arr.indexOf(id) !== index);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!supplier.trim()) {
      errors.supplier = 'Supplier name is required.';
    }
    if (!destinationLocationId) {
      errors.destinationLocationId = 'Destination warehouse location is required.';
    }
    if (items.length === 0) {
      errors.items = 'At least one line item must be added.';
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].quantity || items[i].quantity <= 0) {
        errors[`item_${i}_qty`] = 'Quantity must be greater than zero.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitReceipt = async (targetStatus: 'draft' | 'ready') => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await api.createReceipt({
        supplier: supplier.trim(),
        destination_location_id: Number(destinationLocationId),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        notes: notes.trim() || undefined,
        status: targetStatus,
        items,
      });
      navigate(`/receipts/${created.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Create Inbound Receipt"
        description="Record an incoming supplier shipment. Save as Draft for staging, or mark Ready for warehouse receiving."
        breadcrumbs={[
          { label: 'Receipts', href: '/receipts' },
          { label: 'New Receipt' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/receipts')}
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
          <span>Notice: Duplicate products selected will be automatically aggregated into combined quantities.</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <Card>
          <CardHeader
            title="General Receipt Details"
            subtitle="Supplier, receiving bay, and scheduled intake date"
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Supplier / Vendor"
                required
                value={supplier}
                error={fieldErrors.supplier}
                onChange={(e) => {
                  setSupplier(e.target.value);
                  if (fieldErrors.supplier) {
                    setFieldErrors((prev) => ({ ...prev, supplier: '' }));
                  }
                }}
                placeholder="e.g. Tata Steel Suppliers Ltd."
              />

              <Select
                label="Destination Bay / Location"
                required
                value={destinationLocationId}
                error={fieldErrors.destinationLocationId}
                onChange={(e) => {
                  setDestinationLocationId(Number(e.target.value));
                  if (fieldErrors.destinationLocationId) {
                    setFieldErrors((prev) => ({ ...prev, destinationLocationId: '' }));
                  }
                }}
                options={locations.map((l) => ({
                  value: l.id,
                  label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
                }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Expected / Intake Date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <Input
                label="Notes / Delivery Instructions (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Inspect pallets at Bay 2 before shelving"
              />
            </div>
          </CardBody>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader
            title="Inbound Products"
            subtitle="Specify products and quantities arriving with shipment"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line Item
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {items.map((item, index) => {
              const prod = products.find((p) => p.id === item.product_id);
              const qtyError = fieldErrors[`item_${index}_qty`];

              return (
                <div
                  key={index}
                  className="flex items-start sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80"
                >
                  <div className="flex-1">
                    <Select
                      label={index === 0 ? 'Product SKU' : undefined}
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

                  <div className="w-36">
                    <Input
                      label={index === 0 ? `Qty (${prod?.unit_of_measure || 'units'})` : undefined}
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      error={qtyError}
                      value={item.quantity}
                      onChange={(e) => {
                        handleItemChange(
                          index,
                          'quantity',
                          e.target.value === '' ? '' : parseFloat(e.target.value)
                        );
                        if (qtyError) {
                          setFieldErrors((prev) => ({ ...prev, [`item_${index}_qty`]: '' }));
                        }
                      }}
                    />
                  </div>

                  <div className={index === 0 ? 'pt-6' : ''}>
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={items.length <= 1 ? 'Minimum 1 item required' : 'Remove item'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/receipts')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              onClick={() => submitReceipt('draft')}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              onClick={() => submitReceipt('ready')}
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
