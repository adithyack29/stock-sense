import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Product, Location } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

export const NewReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [supplier, setSupplier] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: number; quantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [prodList, locList] = await Promise.all([api.getProducts(), api.getLocations()]);
        setProducts(prodList);
        setLocations(locList);
        if (locList.length > 0) setDestinationLocationId(locList[0].id);
        if (prodList.length > 0) setItems([{ product_id: prodList[0].id, quantity: 10 }]);
      } catch (err: any) {
        setError(err.message || 'Failed to load options');
      }
    };
    loadPrerequisites();
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems([...items, { product_id: products[0].id, quantity: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) {
      setError('Supplier name is required.');
      return;
    }
    if (!destinationLocationId) {
      setError('Please select a destination warehouse location.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one line item to the receipt.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await api.createReceipt({
        supplier,
        destination_location_id: Number(destinationLocationId),
        notes,
        items,
      });
      navigate(`/receipts/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Create Inbound Receipt"
        description="Record an incoming supplier shipment to prepare for warehouse intake and verification."
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader title="General Receipt Information" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Supplier / Vendor"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Acme Industrial Supplies"
              />

              <Select
                label="Destination Warehouse Location"
                required
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(Number(e.target.value))}
                options={locations.map((l) => ({
                  value: l.id,
                  label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
                }))}
              />
            </div>

            <Input
              label="Notes / Delivery Instructions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inspect pallets at Bay 2 before shelving"
            />
          </CardBody>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader
            title="Receipt Line Items"
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
              return (
                <div
                  key={index}
                  className="flex items-end gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80"
                >
                  <div className="flex-1">
                    <Select
                      label={`Item #${index + 1} Product`}
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

                  <div className="w-32">
                    <Input
                      label={`Qty (${prod?.unit_of_measure || 'units'})`}
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 mb-0.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/receipts')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Save Receipt
          </Button>
        </div>
      </form>
    </div>
  );
};
