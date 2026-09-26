import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowDownToLine, FilterX, Eye, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { Receipt } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export const ReceiptsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReceipts = async () => {
    try {
      setIsLoading(true);
      const data = await api.getReceipts({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load receipts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter, search]);

  const hasActiveFilters = Boolean(search || statusFilter);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const columns: Column<Receipt>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono font-semibold text-indigo-600 hover:text-indigo-900">
          {row.reference}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Intake Date',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier / Vendor',
      render: (row) => <span className="font-medium text-slate-800">{row.supplier}</span>,
    },
    {
      key: 'destination_location_name',
      header: 'Target Bay / Rack',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block w-fit">
            {row.destination_location_name || `Location #${row.destination_location_id}`}
          </span>
          {row.warehouse_name && (
            <span className="text-[10px] text-slate-400 mt-0.5">{row.warehouse_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'items_count',
      header: 'Line Items',
      align: 'center',
      render: (row) => (
        <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
          {row.items?.length || 0} items
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status as any} size="sm">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Button
          variant={row.status === 'ready' ? 'primary' : 'outline'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/receipts/${row.id}`);
          }}
          className="text-xs"
        >
          {row.status === 'ready' ? 'Validate' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipt Operations"
        description="Inbound inventory intake. Staging goods as Draft or Ready, then validating to increase on-hand stock and log ledger movements."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/receipts/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Inbound Receipt
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search reference or supplier..."
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready (Verify)</option>
            <option value="done">Done (Received)</option>
            <option value="canceled">Canceled</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              leftIcon={<FilterX className="w-3.5 h-3.5" />}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table / Empty State */}
      {!isLoading && receipts.length === 0 ? (
        <EmptyState
          icon={<ArrowDownToLine className="w-6 h-6 text-slate-400" />}
          title={hasActiveFilters ? 'No receipts matching filters' : 'No inbound receipts recorded'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search terms or clearing status filters.'
              : 'Create your first supplier receipt to intake inventory into warehouse racks.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create Inbound Receipt'}
          onAction={hasActiveFilters ? handleClearFilters : () => navigate('/receipts/new')}
        />
      ) : (
        <Table
          data={receipts}
          columns={columns}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyText="No receipts found matching filters."
          onRowClick={(r) => navigate(`/receipts/${r.id}`)}
        />
      )}
    </div>
  );
};
