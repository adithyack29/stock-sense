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

export const NewTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sourceLocationId, setSourceLocationId] = useState<number | ''>('');
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
        if (locList.length >= 2) {
          setSourceLocationId(locList[0].id);
          setDestinationLocationId(locList[1].id);
        }
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
    if (!sourceLocationId || !destinationLocationId) {
      setError('Both source and destination locations must be selected.');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      setError('Source and destination locations cannot be identical.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one line item to the transfer.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await api.createTransfer({
        source_location_id: Number(sourceLocationId),
        destination_location_id: Number(destinationLocationId),
        notes,
        items,
      });
      navigate(`/transfers/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Create Internal Stock Transfer"
        description="Schedule relocation of goods between warehouse bays or across plant facilities."
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader title="Transfer Locations" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Source Origin Location"
                required
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(Number(e.target.value))}
                options={locations.map((l) => ({
                  value: l.id,
                  label: `${l.name} (${l.warehouse_name || 'Warehouse'})`,
                }))}
              />

              <Select
                label="Destination Target Location"
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
              label="Transfer Purpose / Reference Note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Move steel to fabrication line floor"
            />
          </CardBody>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader
            title="Items to Relocate"
            subtitle="Select SKU and quantity to transfer between racks"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Item
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
          <Button type="button" variant="outline" onClick={() => navigate('/transfers')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Schedule Transfer
          </Button>
        </div>
      </form>
    </div>
  );
};
