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
  ArrowRight,
  ArrowLeftRight,
} from 'lucide-react';
import { api } from '../../api';
import { InternalTransfer, Stock } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<InternalTransfer | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog states
  const [isConfirmValidateOpen, setIsConfirmValidateOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTransfer = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      setActionError(null);
      const [transData, stockData] = await Promise.all([
        api.getTransfer(parseInt(id, 10)),
        api.getStock(),
      ]);
      setTransfer(transData);
      setStocks(stockData);
    } catch (err: any) {
      setError(err.message || 'Transfer order could not be loaded');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  const handleMarkReady = async () => {
    if (!transfer) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.updateTransferStatus(transfer.id, 'ready');
      setTransfer(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update transfer status to Ready.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelTransfer = async () => {
    if (!transfer) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.updateTransferStatus(transfer.id, 'canceled');
      setTransfer(updated);
      setIsConfirmCancelOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel transfer order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidateTransfer = async () => {
    if (!transfer) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.validateTransfer(transfer.id);
      setTransfer(updated);
      setIsConfirmValidateOpen(false);
      // Refresh live stock levels
      const updatedStocks = await api.getStock();
      setStocks(updatedStocks);
    } catch (err: any) {
      setActionError(err.message || 'Transfer execution failed.');
      setIsConfirmValidateOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading transfer order details..." />;
  if (error || !transfer) {
    return (
      <ErrorState
        title="Transfer not found"
        message={error || 'Unable to locate transfer record.'}
        onRetry={() => navigate('/transfers')}
      />
    );
  }

  const isDraft = transfer.status === 'draft';
  const isReady = transfer.status === 'ready';
  const isDone = transfer.status === 'done';
  const isCanceled = transfer.status === 'canceled';

  const getItemSourceStock = (productId: number): number => {
    const match = stocks.find(
      (s) => s.product_id === productId && s.location_id === transfer.source_location_id
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
      key: 'source_stock',
      header: 'Available at Source',
      align: 'right',
      render: (item) => {
        const avail = getItemSourceStock(item.product_id);
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
      header: 'Quantity to Relocate',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {formatQuantity(item.quantity, item.unit_of_measure)}
        </span>
      ),
    },
    {
      key: 'status_preview',
      header: 'Stock Relocation Effect',
      align: 'right',
      render: (item) => (
        <span
          className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
            isDone
              ? 'bg-emerald-50 text-emerald-700'
              : isCanceled
              ? 'bg-slate-100 text-slate-500 line-through'
              : 'bg-indigo-50 text-indigo-700'
          }`}
        >
          {isDone
            ? '✓ Transferred between locations'
            : isCanceled
            ? 'No change'
            : `Source -${item.quantity} → Dest +${item.quantity}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Transfer ${transfer.reference}`}
        description={`${transfer.source_location_name} → ${transfer.destination_location_name}`}
        breadcrumbs={[
          { label: 'Transfers', href: '/transfers' },
          { label: transfer.reference },
        ]}
        badge={<Badge variant={transfer.status as any}>{transfer.status}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/transfers')}
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
                  Cancel Transfer
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

            {isReady && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmCancelOpen(true)}
                  disabled={isProcessing}
                  leftIcon={<Ban className="w-3.5 h-3.5 text-rose-500" />}
                >
                  Cancel Transfer
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsConfirmValidateOpen(true)}
                  isLoading={isProcessing}
                  leftIcon={<ArrowLeftRight className="w-4 h-4" />}
                >
                  Execute Transfer
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
                Inventory Successfully Relocated
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Stock was deducted from <span className="font-semibold">{transfer.source_location_name}</span> and
                credited to <span className="font-semibold">{transfer.destination_location_name}</span>. Total
                inventory remains unchanged. An immutable record has been logged in the Stock Ledger.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/move-history?search=${transfer.reference}`}>
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

      {isReady && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900">
              Ready for Physical Relocation & Validation
            </h4>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Goods are scheduled for movement. Click <strong>"Execute Transfer"</strong> to deduct stock from the source
              rack, credit it to the destination rack, and log the ledger movement.
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
            <h4 className="text-xs font-bold text-slate-800">Draft Stock Transfer (Staging)</h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              This transfer order is currently in draft. Stock will NOT be relocated until the order is
              marked <strong>Ready</strong> and then <strong>Executed</strong>.
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
            <h4 className="text-xs font-bold text-rose-900">Transfer Canceled (Void)</h4>
            <p className="text-[11px] text-rose-700 mt-0.5">
              This transfer order was canceled prior to execution. No inventory balances were changed.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Route Details Card */}
        <Card className="md:col-span-1">
          <CardHeader title="Transfer Route" />
          <CardBody className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Reference Code</span>
              <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {transfer.reference}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Source Location (Origin)</span>
              <span className="font-semibold text-slate-800 text-sm block">
                {transfer.source_location_name}
              </span>
              {transfer.source_warehouse_name && (
                <span className="text-[11px] text-slate-500">
                  Warehouse: {transfer.source_warehouse_name}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Destination Location (Target)</span>
              <span className="font-semibold text-indigo-700 text-sm block">
                {transfer.destination_location_name}
              </span>
              {transfer.destination_warehouse_name && (
                <span className="text-[11px] text-slate-500">
                  Warehouse: {transfer.destination_warehouse_name}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Scheduled Transfer Date</span>
              <span className="font-medium text-slate-800">{formatDate(transfer.date)}</span>
            </div>

            {transfer.created_at && (
              <div>
                <span className="text-slate-400 block mb-0.5">Created Date</span>
                <span className="font-mono text-slate-600">{formatDate(transfer.created_at)}</span>
              </div>
            )}

            {transfer.updated_at && (
              <div>
                <span className="text-slate-400 block mb-0.5">Last Status Update</span>
                <span className="font-mono text-slate-600">{formatDate(transfer.updated_at)}</span>
              </div>
            )}

            {transfer.notes && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-400 block mb-1">Transfer Purpose / Notes</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 italic text-xs leading-relaxed">
                  {transfer.notes}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Line Items Table */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title={`Items to Relocate (${transfer.items?.length || 0})`}
              subtitle="Stock to be deducted from origin and credited to destination"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(item) => item.id || item.product_id}
                data={transfer.items || []}
                columns={itemColumns}
                emptyText="No line items listed on this transfer order."
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Confirm Execution Modal */}
      <ConfirmDialog
        isOpen={isConfirmValidateOpen}
        onClose={() => setIsConfirmValidateOpen(false)}
        onConfirm={handleValidateTransfer}
        isLoading={isProcessing}
        title="Execute Internal Stock Transfer"
        message={`Are you sure you want to execute transfer ${transfer.reference}? This will execute an atomic database transaction to deduct stock from '${transfer.source_location_name}' and credit it to '${transfer.destination_location_name}'. Total company inventory will remain unchanged. This action cannot be reversed.`}
        confirmLabel="Confirm & Execute Move"
      />

      {/* Confirm Cancel Modal */}
      <ConfirmDialog
        isOpen={isConfirmCancelOpen}
        onClose={() => setIsConfirmCancelOpen(false)}
        onConfirm={handleCancelTransfer}
        isLoading={isProcessing}
        variant="danger"
        title="Cancel Stock Transfer"
        message={`Are you sure you want to cancel transfer ${transfer.reference}? It will be marked as canceled and can no longer be moved. No stock will be altered.`}
        confirmLabel="Yes, Cancel Transfer"
      />
    </div>
  );
};
