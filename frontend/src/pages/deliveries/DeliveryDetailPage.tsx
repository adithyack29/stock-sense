import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Delivery } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const fetchDelivery = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getDelivery(parseInt(id, 10));
      setDelivery(data);
    } catch (err: any) {
      setError(err.message || 'Delivery order could not be loaded');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  const handleValidate = async () => {
    if (!delivery) return;
    try {
      setIsValidating(true);
      await api.validateDelivery(delivery.id);
      setIsConfirmOpen(false);
      fetchDelivery();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading delivery details..." />;
  if (error || !delivery) {
    return (
      <ErrorState
        title="Delivery order not found"
        message={error || 'Unable to find delivery record.'}
        onRetry={() => navigate('/deliveries')}
      />
    );
  }

  const isDone = delivery.status === 'done';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Delivery ${delivery.reference}`}
        description={`Customer: ${delivery.customer} • Origin: ${delivery.source_location_name}`}
        breadcrumbs={[
          { label: 'Deliveries', href: '/deliveries' },
          { label: delivery.reference },
        ]}
        badge={<Badge variant={delivery.status as any}>{delivery.status}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/deliveries')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            {!isDone && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Validate / Ship Order
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader title="Order Information" />
          <CardBody className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Reference</span>
              <span className="font-mono font-semibold text-slate-800">{delivery.reference}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Customer</span>
              <span className="font-medium text-slate-800">{delivery.customer}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Dispatch Location</span>
              <span className="font-medium text-indigo-700 font-mono">
                {delivery.source_location_name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Fulfillment Date</span>
              <span className="font-medium text-slate-800">{formatDate(delivery.date)}</span>
            </div>
            {delivery.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block">Shipping Instructions</span>
                <p className="text-slate-600 mt-1 italic">{delivery.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title="Outbound Items"
              subtitle="Items to pick and deduct from stock"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(item) => item.id || item.product_id}
                data={delivery.items || []}
                emptyText="No line items listed on this delivery order."
                columns={[
                  {
                    key: 'product_name',
                    header: 'Product',
                    render: (item) => (
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {item.product_name}
                        </span>
                        <span className="font-mono text-xs text-slate-400">{item.product_sku}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'quantity',
                    header: 'Quantity to Pick',
                    align: 'right',
                    render: (item) => (
                      <span className="font-mono font-bold text-slate-900">
                        {formatQuantity(item.quantity, item.unit_of_measure)}
                      </span>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleValidate}
        isLoading={isValidating}
        title="Confirm Shipment & Deduct Stock"
        message="Validating this delivery will verify on-hand stock at the dispatch location, decrease the quantities, and record an outbound movement in the stock ledger. Proceed?"
        confirmLabel="Confirm & Ship"
      />
    </div>
  );
};
