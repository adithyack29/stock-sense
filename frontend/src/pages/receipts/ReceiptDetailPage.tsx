import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Receipt } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const fetchReceipt = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getReceipt(parseInt(id, 10));
      setReceipt(data);
    } catch (err: any) {
      setError(err.message || 'Receipt could not be loaded');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
  }, [id]);

  const handleValidate = async () => {
    if (!receipt) return;
    try {
      setIsValidating(true);
      await api.validateReceipt(receipt.id);
      setIsConfirmOpen(false);
      fetchReceipt();
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading receipt order..." />;
  if (error || !receipt) {
    return (
      <ErrorState
        title="Receipt not found"
        message={error || 'Unable to find receipt.'}
        onRetry={() => navigate('/receipts')}
      />
    );
  }

  const isDone = receipt.status === 'done';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Receipt ${receipt.reference}`}
        description={`Supplier: ${receipt.supplier} • Destination: ${receipt.destination_location_name}`}
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
              Back
            </Button>
            {!isDone && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Validate / Receive Goods
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader title="Receipt Information" />
          <CardBody className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Reference</span>
              <span className="font-mono font-semibold text-slate-800">{receipt.reference}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Supplier</span>
              <span className="font-medium text-slate-800">{receipt.supplier}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Destination Rack / Location</span>
              <span className="font-medium text-indigo-700 font-mono">
                {receipt.destination_location_name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Scheduled Date</span>
              <span className="font-medium text-slate-800">{formatDate(receipt.date)}</span>
            </div>
            {receipt.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block">Internal Notes</span>
                <p className="text-slate-600 mt-1 italic">{receipt.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title="Inbound Line Items"
              subtitle="Products to be received into inventory"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(item) => item.id || item.product_id}
                data={receipt.items || []}
                emptyText="No line items listed on this receipt."
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
                    header: 'Quantity',
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
        title="Confirm Receipt & Increase Stock"
        message="Validating this receipt will commit goods into warehouse inventory, update real-time stock balances at this location, and write a traceable entry into the stock ledger. Proceed?"
        confirmLabel="Confirm & Receive"
      />
    </div>
  );
};
