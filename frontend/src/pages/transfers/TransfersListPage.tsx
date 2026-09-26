import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeftRight, FilterX } from 'lucide-react';
import { api } from '../../api';
import { InternalTransfer } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export const TransfersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getTransfers({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setTransfers(data);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter, search]);

  const hasActiveFilters = Boolean(search || statusFilter);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const columns: Column<InternalTransfer>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono font-semibold text-indigo-600 hover:text-indigo-900 cursor-pointer">
          {row.reference}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span>,
    },
    {
      key: 'source_location_name',
      header: 'From (Origin)',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block w-fit">
            {row.source_location_name || `Loc #${row.source_location_id}`}
          </span>
          {row.source_warehouse_name && (
            <span className="text-[10px] text-slate-400 mt-0.5">{row.source_warehouse_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'arrow',
      header: '',
      align: 'center',
      render: () => <span className="text-slate-400 font-bold">→</span>,
    },
    {
      key: 'destination_location_name',
      header: 'To (Destination)',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block w-fit">
            {row.destination_location_name || `Loc #${row.destination_location_id}`}
          </span>
          {row.destination_warehouse_name && (
            <span className="text-[10px] text-indigo-400 mt-0.5">{row.destination_warehouse_name}</span>
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
            navigate(`/transfers/${row.id}`);
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
        title="Internal Stock Transfers"
        description="Relocate inventory between warehouse bays or across facilities. Total company stock remains unchanged while location distribution updates atomically."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/transfers/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Stock Transfer
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search reference or location..."
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
            <option value="ready">Ready (Execute)</option>
            <option value="done">Done (Transferred)</option>
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
      {!isLoading && transfers.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="w-6 h-6 text-slate-400" />}
          title={hasActiveFilters ? 'No transfers matching filters' : 'No stock transfers recorded'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search terms or clearing status filters.'
              : 'Create your first internal stock transfer to move inventory between locations.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create Stock Transfer'}
          onAction={hasActiveFilters ? handleClearFilters : () => navigate('/transfers/new')}
        />
      ) : (
        <Table
          data={transfers}
          columns={columns}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyText="No transfers found matching filters."
          onRowClick={(t) => navigate(`/transfers/${t.id}`)}
        />
      )}
    </div>
  );
};
