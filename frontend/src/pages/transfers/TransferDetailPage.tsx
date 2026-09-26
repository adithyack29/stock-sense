import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { InternalTransfer } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<InternalTransfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const fetchTransfer = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getTransfer(parseInt(id, 10));
      setTransfer(data);
    } catch (err: any) {
      setError(err.message || 'Transfer could not be loaded');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  const handleValidate = async () => {
    if (!transfer) return;
    try {
      setIsValidating(true);
      await api.validateTransfer(transfer.id);
      setIsConfirmOpen(false);
      fetchTransfer();
    } catch (err: any) {
      alert(`Transfer execution failed: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading transfer order..." />;
  if (error || !transfer) {
    return (
      <ErrorState
        title="Transfer not found"
        message={error || 'Unable to locate transfer record.'}
        onRetry={() => navigate('/transfers')}
      />
    );
  }

  const isDone = transfer.status === 'done';

  return (
    <div className="space-y-6">
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
              Back
            </Button>
            {!isDone && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Validate / Execute Move
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader title="Transfer Route" />
          <CardBody className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block">Reference</span>
              <span className="font-mono font-semibold text-slate-800">{transfer.reference}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Source Location</span>
              <span className="font-medium text-slate-800 font-mono">
                {transfer.source_location_name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Destination Location</span>
              <span className="font-medium text-indigo-700 font-mono">
                {transfer.destination_location_name}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Initiated Date</span>
              <span className="font-medium text-slate-800">{formatDate(transfer.date)}</span>
            </div>
            {transfer.notes && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block">Transfer Reason</span>
                <p className="text-slate-600 mt-1 italic">{transfer.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title="Items to Relocate"
              subtitle="Stock to be deducted from source and credited to destination"
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(item) => item.id || item.product_id}
                data={transfer.items || []}
                emptyText="No line items listed on this transfer order."
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
                    header: 'Quantity to Transfer',
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
        title="Confirm Internal Stock Movement"
        message="Validating this transfer will relocate the specified items from the source rack to destination rack. Total enterprise inventory remains constant, while location quantities update in the ledger. Proceed?"
        confirmLabel="Execute Transfer"
      />
    </div>
  );
};
