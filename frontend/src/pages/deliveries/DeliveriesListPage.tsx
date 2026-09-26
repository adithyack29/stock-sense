import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpFromLine } from 'lucide-react';
import { api } from '../../api';
import { Delivery } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
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
      const data = await api.getDeliveries();
      setDeliveries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const filtered = deliveries.filter((d) => {
    const matchesSearch =
      d.reference.toLowerCase().includes(search.toLowerCase()) ||
      d.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      key: 'customer',
      header: 'Customer / Recipient',
      render: (row) => <span className="font-medium text-slate-800">{row.customer}</span>,
    },
    {
      key: 'source_location_name',
      header: 'Source Bay / Dispatch Rack',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.source_location_name || `Location #${row.source_location_id}`}
        </span>
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
      key: 'date',
      header: 'Scheduled Date',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span>,
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Operations"
        description="Outbound customer orders. Fulfilling and completing deliveries verifies stock availability, deducts inventory, and writes to the ledger."
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search reference or customer..."
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="waiting">Waiting</option>
            <option value="ready">Ready (Pick)</option>
            <option value="done">Done (Shipped)</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        emptyText="No delivery orders found matching filters."
        onRowClick={(d) => navigate(`/deliveries/${d.id}`)}
      />
    </div>
  );
};
