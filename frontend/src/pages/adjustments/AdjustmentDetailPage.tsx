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
  Scale,
  Building2,
  MapPin,
  FileText,
  User,
} from 'lucide-react';
import { api } from '../../api';
import { StockAdjustment, Stock } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const AdjustmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [adjustment, setAdjustment] = useState<StockAdjustment | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal dialog states
  const [isConfirmValidateOpen, setIsConfirmValidateOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAdjustment = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      setActionError(null);
      const [adjData, stockData] = await Promise.all([
        api.getAdjustment(parseInt(id, 10)),
        api.getStock(),
      ]);
      setAdjustment(adjData);
      setStocks(stockData);
    } catch (err: any) {
      setError(err.message || 'Stock adjustment could not be loaded');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustment();
  }, [id]);

  const handleValidateAdjustment = async () => {
    if (!adjustment) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.validateAdjustment(adjustment.id);
      setAdjustment(updated);
      setIsConfirmValidateOpen(false);
      // Refresh live stock
      const stockData = await api.getStock();
      setStocks(stockData);
    } catch (err: any) {
      setActionError(err.message || 'Failed to validate stock adjustment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAdjustment = async () => {
    if (!adjustment) return;
    try {
      setIsProcessing(true);
      setActionError(null);
      const updated = await api.updateAdjustmentStatus(adjustment.id, 'canceled');
      setAdjustment(updated);
      setIsConfirmCancelOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel stock adjustment.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading stock adjustment details..." />;
  }

  if (error || !adjustment) {
    return (
      <ErrorState
        title="Stock Adjustment Not Found"
        message={error || 'The requested stock adjustment could not be found.'}
        onRetry={fetchAdjustment}
      />
    );
  }

  // Find live current stock for this product and location
  const currentLiveStock = stocks.find(
    (s) => s.product_id === adjustment.product_id && s.location_id === adjustment.location_id
  );
  const currentLiveQty = currentLiveStock ? currentLiveStock.quantity : 0;

  const isDraft = adjustment.status === 'draft';
  const isDone = adjustment.status === 'done';
  const isCanceled = adjustment.status === 'canceled';

  const diff = adjustment.difference;
  const isNegative = diff < 0;
  const isPositive = diff > 0;
  const isZero = diff === 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <PageHeader
        title={adjustment.reference}
        description="Physical stock count reconciliation document"
        breadcrumbs={[
          { label: 'Stock Adjustments', href: '/adjustments' },
          { label: adjustment.reference },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/adjustments')}
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
                  className="text-rose-600 hover:text-rose-700 hover:border-rose-300"
                  leftIcon={<Ban className="w-4 h-4" />}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsConfirmValidateOpen(true)}
                  disabled={isProcessing}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Validate Adjustment
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Action Error Alert */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Adjustment Validation Error</span>
            <span>{actionError}</span>
          </div>
        </div>
      )}

      {/* Status Banners */}
      {isDone && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-sm">Stock Adjustment Verified & Reconciled</div>
              <div className="text-xs text-emerald-700">
                Inventory balance updated to{' '}
                <span className="font-mono font-bold">
                  {formatQuantity(adjustment.counted_quantity, adjustment.unit_of_measure)}
                </span>
                . {diff !== 0 ? 'Stock Movement ledger entry recorded.' : 'Zero variance reconciliation completed.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/stock?search=${encodeURIComponent(adjustment.product_name || '')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
            >
              <Boxes className="w-3.5 h-3.5" />
              View Stock
            </Link>
            {diff !== 0 && (
              <Link
                to={`/move-history?search=${encodeURIComponent(adjustment.reference)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                Ledger Entry
              </Link>
            )}
          </div>
        </div>
      )}

      {isCanceled && (
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 flex items-center gap-3 shadow-xs">
          <Ban className="w-6 h-6 text-slate-500 shrink-0" />
          <div>
            <div className="font-bold text-sm">Adjustment Canceled</div>
            <div className="text-xs text-slate-600">
              This adjustment order was marked as canceled. No physical stock or ledger entries were modified.
            </div>
          </div>
        </div>
      )}

      {isDraft && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center gap-3 shadow-xs">
          <Clock className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <div className="font-bold text-sm">Draft Stock Count Pending Validation</div>
            <div className="text-xs text-amber-700">
              Live inventory has not been modified. Click &quot;Validate Adjustment&quot; to apply count and update ledger.
            </div>
          </div>
        </div>
      )}

      {/* Main Reconciliation Comparison Card */}
      <Card>
        <CardHeader
          title="Stock Reconciliation Comparison"
          action={<Badge variant={adjustment.status}>{adjustment.status}</Badge>}
        />
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            {/* System Qty */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                {isDone ? 'Recorded System Stock' : 'Recorded Stock (at creation)'}
              </span>
              <span className="font-mono text-xl font-bold text-slate-800 block">
                {formatQuantity(adjustment.previous_quantity, adjustment.unit_of_measure)}
              </span>
              {isDraft && (
                <span className="text-[11px] text-slate-500 block mt-1">
                  Current live: {formatQuantity(currentLiveQty, adjustment.unit_of_measure)}
                </span>
              )}
            </div>

            {/* Physical Count */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Physical Counted Qty
              </span>
              <span className="font-mono text-xl font-bold text-indigo-700 block">
                {formatQuantity(adjustment.counted_quantity, adjustment.unit_of_measure)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">Actual verified stock</span>
            </div>

            {/* Difference / Variance */}
            <div
              className={`p-4 rounded-lg border shadow-2xs ${
                isPositive
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : isNegative
                  ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <span className="text-xs font-medium block mb-1">
                Adjustment Discrepancy
              </span>
              <span className="font-mono text-xl font-bold block">
                {isPositive ? `+${diff}` : diff} {adjustment.unit_of_measure || 'units'}
              </span>
              <span className="text-[11px] block mt-1">
                {isPositive ? 'Discovered / Surplus' : isNegative ? 'Shortage / Variance' : 'Exact match (zero diff)'}
              </span>
            </div>

            {/* Resulting System Stock */}
            <div className="bg-indigo-50/60 p-4 rounded-lg border border-indigo-200 shadow-2xs">
              <span className="text-xs font-medium text-indigo-900 block mb-1">
                {isDone ? 'Reconciled System Stock' : 'Projected System Stock'}
              </span>
              <span className="font-mono text-xl font-bold text-indigo-900 block">
                {formatQuantity(adjustment.counted_quantity, adjustment.unit_of_measure)}
              </span>
              <span className="text-[11px] text-indigo-700 block mt-1">
                {isDone ? 'Live active balance' : 'After validation'}
              </span>
            </div>
          </div>

          {/* Product & Location Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Product & Storage Route
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Boxes className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-500 block">Product</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {adjustment.product_name}
                    </span>
                    {adjustment.product_sku && (
                      <span className="font-mono text-xs text-slate-500 block">
                        SKU: {adjustment.product_sku}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-500 block">Location / Rack</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {adjustment.location_name}
                    </span>
                    {adjustment.warehouse_name && (
                      <span className="text-xs text-slate-500 block">
                        Warehouse: {adjustment.warehouse_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audit Trail & Justification
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Scale className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-500 block">Audited Reason</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {adjustment.reason}
                    </span>
                  </div>
                </div>

                {adjustment.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">Audit Notes</span>
                      <span className="text-xs text-slate-700 italic">
                        &quot;{adjustment.notes}&quot;
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-500 block">Audited By & Date</span>
                    <span className="text-xs text-slate-700">
                      {adjustment.user_name || 'Inventory Staff'} on {formatDate(adjustment.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Confirmation Dialog for Validation */}
      <ConfirmDialog
        isOpen={isConfirmValidateOpen}
        title="Confirm Stock Adjustment Validation"
        message={`Adjust ${adjustment.product_name} at ${adjustment.location_name} from ${adjustment.previous_quantity} ${adjustment.unit_of_measure || 'units'} to ${adjustment.counted_quantity} ${adjustment.unit_of_measure || 'units'}? This will immediately reconcile the database inventory balance and log a verified Stock Movement.`}
        confirmLabel="Confirm Adjustment"
        cancelLabel="Cancel"
        variant="primary"
        isLoading={isProcessing}
        onConfirm={handleValidateAdjustment}
        onClose={() => setIsConfirmValidateOpen(false)}
      />

      {/* Confirmation Dialog for Cancel */}
      <ConfirmDialog
        isOpen={isConfirmCancelOpen}
        title="Cancel Stock Adjustment"
        message={`Are you sure you want to cancel adjustment ${adjustment.reference}? This action cannot be undone and no stock will be modified.`}
        confirmLabel="Yes, Cancel Adjustment"
        cancelLabel="Keep Adjustment"
        variant="danger"
        isLoading={isProcessing}
        onConfirm={handleCancelAdjustment}
        onClose={() => setIsConfirmCancelOpen(false)}
      />
    </div>
  );
};
