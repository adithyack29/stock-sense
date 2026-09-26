import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpFromLine, FilterX } from 'lucide-react';
import { api } from '../../api';
import { Delivery } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export const DeliveriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDeliveries({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setDeliveries(data);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter, search]);

  const hasActiveFilters = Boolean(search || statusFilter);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const columns: Column<Delivery>[] = [
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
      header: 'Scheduled Date',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span>,
    },
    {
      key: 'customer',
      header: 'Customer / Recipient',
      render: (row) => <span className="font-medium text-slate-800">{row.customer}</span>,
    },
    {
      key: 'source_location_name',
      header: 'Source Bay / Dispatch Rack',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block w-fit">
            {row.source_location_name || `Location #${row.source_location_id}`}
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
            navigate(`/deliveries/${row.id}`);
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
        title="Delivery Operations"
        description="Outbound customer orders. Fulfilling and completing deliveries verifies stock availability, deducts inventory, and writes to the immutable ledger."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/deliveries/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Delivery Order
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search reference or customer..."
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
            <option value="waiting">Waiting</option>
            <option value="ready">Ready (Pick)</option>
            <option value="done">Done (Shipped)</option>
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
      {!isLoading && deliveries.length === 0 ? (
        <EmptyState
          icon={<ArrowUpFromLine className="w-6 h-6 text-slate-400" />}
          title={hasActiveFilters ? 'No deliveries matching filters' : 'No delivery orders found'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search terms or clearing status filters.'
              : 'Create your first delivery order to pick and ship products to customers.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create Delivery Order'}
          onAction={hasActiveFilters ? handleClearFilters : () => navigate('/deliveries/new')}
        />
      ) : (
        <Table
          data={deliveries}
          columns={columns}
          keyExtractor={(d) => d.id}
          isLoading={isLoading}
          emptyText="No delivery orders found matching filters."
          onRowClick={(d) => navigate(`/deliveries/${d.id}`)}
        />
      )}
    </div>
  );
};
