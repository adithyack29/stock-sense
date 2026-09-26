import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Boxes,
  History,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../api';
import { Delivery, Stock } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog states
  const [isConfirmValidateOpen, setIsConfirmValidateOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDelivery = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      setActionError(null);
      const [delivData, stockData] = await Promise.all([
        api.getDelivery(parseInt(id, 10)),
        api.getStock(),
      ]);
      setDelivery(delivData);
      setStocks(stockData);
    } catch (err: any) {
      setError(err.message || 'Delivery order could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  const handleMarkReady = async () => {
    if (!delivery) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.updateDeliveryStatus(delivery.id, 'ready');
      setDelivery(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update delivery status to Ready.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!delivery) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.updateDeliveryStatus(delivery.id, 'canceled');
      setDelivery(updated);
      setIsConfirmCancelOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel delivery order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidateDelivery = async () => {
    if (!delivery) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.validateDelivery(delivery.id);
      setDelivery(updated);
      setIsConfirmValidateOpen(false);
      // Refresh stocks to reflect updated on-hand values
      const updatedStocks = await api.getStock();
      setStocks(updatedStocks);
    } catch (err: any) {
      setActionError(err.message || 'Dispatch failed.');
      setIsConfirmValidateOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading delivery order details..." />;
  if (error || !delivery) {
    return (
      <ErrorState
        title="Delivery order not found"
        message={error || 'Unable to locate delivery record.'}
        onRetry={() => navigate('/deliveries')}
      />
    );
  }

  const isDraft = delivery.status === 'draft';
  const isWaiting = delivery.status === 'waiting';
  const isReady = delivery.status === 'ready';
  const isDone = delivery.status === 'done';
  const isCanceled = delivery.status === 'canceled';

  const getItemStock = (productId: number): number => {
    const match = stocks.find(
      (s) => s.product_id === productId && s.location_id === delivery.source_location_id
    );
    return match ? match.quantity : 0;
  };

  const itemColumns: Column<any>[] = [
    {
      key: 'product_name',
      header: 'Product Name',
      render: (item) => (
        <div>
          <Link
            to={`/products/${item.product_id}`}
            className="font-semibold text-slate-900 hover:text-indigo-600 block transition-colors"
          >
            {item.product_name}
          </Link>
          <span className="font-mono text-[11px] text-slate-400">ID #{item.product_id}</span>
        </div>
      ),
    },
    {
      key: 'product_sku',
      header: 'SKU / Code',
      render: (item) => (
        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
          {item.product_sku || '—'}
        </span>
      ),
    },
    {
      key: 'available_stock',
      header: 'Available On-Hand',
      align: 'right',
      render: (item) => {
        const avail = getItemStock(item.product_id);
        const isInsufficient = !isDone && !isCanceled && avail < item.quantity;
        return (
          <div className="flex flex-col items-end">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                isInsufficient
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {formatQuantity(avail, item.unit_of_measure)}
            </span>
            {isInsufficient && (
              <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
                Insufficient stock!
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Quantity to Deliver',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {formatQuantity(item.quantity, item.unit_of_measure)}
        </span>
      ),
    },
    {
      key: 'status_preview',
      header: 'Impact on Stock',
      align: 'right',
      render: (item) => (
        <span
          className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
            isDone
              ? 'bg-emerald-50 text-emerald-700'
              : isCanceled
              ? 'bg-slate-100 text-slate-500 line-through'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {isDone
            ? '✓ Deducted from on-hand'
            : isCanceled
            ? 'No change'
            : `-${item.quantity} ${item.unit_of_measure || ''}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Delivery ${delivery.reference}`}
        description={`Customer: ${delivery.customer} • Origin: ${
          delivery.source_location_name || 'Location #' + delivery.source_location_id
        }`}
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
              Back to List
            </Button>

            {isDraft && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmCancelOpen(true)}
                  disabled={isProcessing}
                  leftIcon={<Ban className="w-3.5 h-3.5 text-rose-500" />}
                >
                  Cancel Order
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMarkReady}
                  isLoading={isProcessing}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Mark as Ready
                </Button>
              </>
            )}

            {(isReady || isWaiting) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmCancelOpen(true)}
                  disabled={isProcessing}
                  leftIcon={<Ban className="w-3.5 h-3.5 text-rose-500" />}
                >
                  Cancel Order
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsConfirmValidateOpen(true)}
                  isLoading={isProcessing}
                  leftIcon={<Truck className="w-4 h-4" />}
                >
                  Validate / Ship Order
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Action Error Alerts */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* Status Banners */}
      {isDone && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Goods Fully Dispatched & Stock Deducted
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Physical on-hand inventory balances have been deducted at{' '}
                <span className="font-semibold">{delivery.source_location_name}</span>. An immutable
                transaction has been appended to the Stock Ledger.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/move-history?search=${delivery.reference}`}>
              <Button variant="outline" size="sm" className="bg-white text-xs">
                View Ledger Entry →
              </Button>
            </Link>
            <Link to="/stock">
              <Button variant="outline" size="sm" className="bg-white text-xs">
                View Stock →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {(isReady || isWaiting) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900">
              Ready for Picking & Dispatch Validation
            </h4>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Goods are staged for picking. Click <strong>"Validate / Ship Order"</strong> to verify
              live stock, deduct quantities from inventory, and register outbound ledger records.
            </p>
          </div>
        </div>
      )}

      {isDraft && (
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Draft Outbound Order (Staging)</h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              This delivery is currently in draft. Stock will NOT be deducted until the order is
              marked <strong>Ready</strong> and then <strong>Validated</strong>.
            </p>
          </div>
        </div>
      )}

      {isCanceled && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-900">Delivery Canceled (Void)</h4>
            <p className="text-[11px] text-rose-700 mt-0.5">
              This delivery order was canceled prior to dispatch. No stock was deducted.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Overview Card */}
        <Card className="md:col-span-1">
          <CardHeader title="Order Information" />
          <CardBody className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Reference Code</span>
              <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {delivery.reference}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Customer / Recipient</span>
              <span className="font-semibold text-slate-800 text-sm">{delivery.customer}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Source Dispatch Bay</span>
              <span className="font-medium text-indigo-700 font-mono block">
                {delivery.source_location_name}
              </span>
              {delivery.warehouse_name && (
                <span className="text-[11px] text-slate-500">Warehouse: {delivery.warehouse_name}</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Scheduled Fulfillment Date</span>
              <span className="font-medium text-slate-800">{formatDate(delivery.date)}</span>
            </div>

            {delivery.created_at && (
              <div>
                <span className="text-slate-400 block mb-0.5">Created Date</span>
                <span className="font-mono text-slate-600">{formatDate(delivery.created_at)}</span>
              </div>
            )}

            {delivery.updated_at && (
              <div>
                <span className="text-slate-400 block mb-0.5">Last Status Update</span>
                <span className="font-mono text-slate-600">{formatDate(delivery.updated_at)}</span>
              </div>
            )}

            {delivery.notes && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-400 block mb-1">Shipping / Handling Instructions</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 italic text-xs leading-relaxed">
                  {delivery.notes}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Line Items Table */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title={`Outbound Line Items (${delivery.items?.length || 0})`}
              subtitle="Products and quantities to pick and deduct from warehouse inventory"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(item) => item.id || item.product_id}
                data={delivery.items || []}
                columns={itemColumns}
                emptyText="No line items listed on this delivery order."
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Confirm Validation Modal */}
      <ConfirmDialog
        isOpen={isConfirmValidateOpen}
        onClose={() => setIsConfirmValidateOpen(false)}
        onConfirm={handleValidateDelivery}
        isLoading={isProcessing}
        title="Confirm Shipment & Deduct Stock"
        message={`Are you sure you want to validate delivery ${delivery.reference}? This will execute an atomic database transaction to deduct on-hand stock for all line items at '${delivery.source_location_name}' and log permanent entries in the Stock Ledger. This action cannot be reversed.`}
        confirmLabel="Confirm & Ship Goods"
      />

      {/* Confirm Cancel Modal */}
      <ConfirmDialog
        isOpen={isConfirmCancelOpen}
        onClose={() => setIsConfirmCancelOpen(false)}
        onConfirm={handleCancelDelivery}
        isLoading={isProcessing}
        variant="danger"
        title="Cancel Delivery Order"
        message={`Are you sure you want to cancel delivery ${delivery.reference}? It will be marked as canceled and can no longer be shipped. No inventory will be altered.`}
        confirmLabel="Yes, Cancel Delivery"
      />
    </div>
  );
};
