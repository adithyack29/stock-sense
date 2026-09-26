import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  ArrowRight,
  Boxes,
  History,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api';
import { Receipt } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const ReceiptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal dialog states
  const [isConfirmValidateOpen, setIsConfirmValidateOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchReceipt = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      setActionError(null);
      const data = await api.getReceipt(parseInt(id, 10));
      setReceipt(data);
    } catch (err: any) {
      setError(err.message || 'Receipt could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
  }, [id]);

  const handleMarkReady = async () => {
    if (!receipt) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.updateReceiptStatus(receipt.id, 'ready');
      setReceipt(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update receipt status to Ready.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelReceipt = async () => {
    if (!receipt) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.updateReceiptStatus(receipt.id, 'canceled');
      setReceipt(updated);
      setIsConfirmCancelOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel receipt.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidateReceipt = async () => {
    if (!receipt) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.validateReceipt(receipt.id);
      setReceipt(updated);
      setIsConfirmValidateOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to validate and receive goods.');
      setIsConfirmValidateOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading receipt order..." />;
  if (error || !receipt) {
    return (
      <ErrorState
        title="Receipt not found"
        message={error || 'Unable to locate receipt record.'}
        onRetry={() => navigate('/receipts')}
      />
    );
  }

  const isDraft = receipt.status === 'draft';
  const isReady = receipt.status === 'ready';
  const isDone = receipt.status === 'done';
  const isCanceled = receipt.status === 'canceled';

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
      key: 'quantity',
      header: 'Quantity to Receive',
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
              : 'bg-indigo-50 text-indigo-700'
          }`}
        >
          {isDone ? '✓ Added to on-hand' : isCanceled ? 'No change' : `+${item.quantity} ${item.unit_of_measure || ''}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Receipt ${receipt.reference}`}
        description={`Supplier: ${receipt.supplier} • Destination: ${
          receipt.destination_location_name || 'Location #' + receipt.destination_location_id
        }`}
        breadcrumbs={[
          { label: 'Receipts', href: '/receipts' },
          { label: receipt.reference },
        ]}
        badge={<Badge variant={receipt.status as any}>{receipt.status}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/receipts')}
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
                  Cancel Receipt
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
                  Cancel Receipt
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setIsConfirmValidateOpen(true)}
                  isLoading={isProcessing}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Validate / Receive Goods
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Action feedback errors */}
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
              <h4 className="text-xs font-bold text-emerald-900">Goods Fully Received into Inventory</h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Physical on-hand inventory balances have been increased at{' '}
                <span className="font-semibold">{receipt.destination_location_name}</span>. An immutable
                transaction has been appended to the Stock Ledger.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/move-history?search=${receipt.reference}`}>
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
            <h4 className="text-xs font-bold text-blue-900">Ready for Physical Verification & Intake</h4>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Goods are scheduled for unloading. Click <strong>"Validate / Receive Goods"</strong> above
              once physical verification is complete to commit inventory into the system.
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
            <h4 className="text-xs font-bold text-slate-800">Draft Inbound Order (Staging)</h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              This receipt is currently in draft. Stock will NOT be modified until the order is marked
              <strong> Ready</strong> and then <strong>Validated</strong>.
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
            <h4 className="text-xs font-bold text-rose-900">Receipt Canceled (Void)</h4>
            <p className="text-[11px] text-rose-700 mt-0.5">
              This shipment order was canceled prior to intake. No inventory was changed.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Receipt Overview Card */}
        <Card className="md:col-span-1">
          <CardHeader title="Order Information" />
          <CardBody className="space-y-3.5 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Reference Code</span>
              <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {receipt.reference}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Supplier / Vendor</span>
              <span className="font-semibold text-slate-800 text-sm">{receipt.supplier}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Target Destination Bay</span>
              <span className="font-medium text-indigo-700 font-mono block">
                {receipt.destination_location_name}
              </span>
              {receipt.warehouse_name && (
                <span className="text-[11px] text-slate-500">Warehouse: {receipt.warehouse_name}</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Scheduled Intake Date</span>
              <span className="font-medium text-slate-800">{formatDate(receipt.date)}</span>
            </div>

            {receipt.updated_at && (
              <div>
                <span className="text-slate-400 block mb-0.5">Last Status Update</span>
                <span className="font-mono text-slate-600">{formatDate(receipt.updated_at)}</span>
              </div>
            )}

            {receipt.notes && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-400 block mb-1">Carrier / Handling Notes</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 italic text-xs leading-relaxed">
                  {receipt.notes}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Line Items Table */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title={`Inbound Line Items (${receipt.items?.length || 0})`}
              subtitle="Products and verified quantities to receive into on-hand stock"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(item) => item.id || item.product_id}
                data={receipt.items || []}
                columns={itemColumns}
                emptyText="No line items listed on this receipt."
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Confirm Validation Modal */}
      <ConfirmDialog
        isOpen={isConfirmValidateOpen}
        onClose={() => setIsConfirmValidateOpen(false)}
        onConfirm={handleValidateReceipt}
        isLoading={isProcessing}
        title="Confirm Receipt & Increase Stock"
        message={`Are you sure you want to validate receipt ${receipt.reference}? This will execute an atomic database transaction to increase on-hand stock for all line items at '${receipt.destination_location_name}' and log permanent entries in the Stock Ledger. This action cannot be reversed.`}
        confirmLabel="Confirm & Receive Goods"
      />

      {/* Confirm Cancel Modal */}
      <ConfirmDialog
        isOpen={isConfirmCancelOpen}
        onClose={() => setIsConfirmCancelOpen(false)}
        onConfirm={handleCancelReceipt}
        isLoading={isProcessing}
        variant="danger"
        title="Cancel Inbound Receipt"
        message={`Are you sure you want to cancel receipt ${receipt.reference}? It will be marked as canceled and can no longer be received. No stock will be altered.`}
        confirmLabel="Yes, Cancel Receipt"
      />
    </div>
  );
};
