import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeftRight } from 'lucide-react';
import { api } from '../../api';
import { InternalTransfer } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
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
      const data = await api.getTransfers();
      setTransfers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const filtered = transfers.filter((t) => {
    const matchesSearch =
      t.reference.toLowerCase().includes(search.toLowerCase()) ||
      (t.source_location_name && t.source_location_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.destination_location_name && t.destination_location_name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      key: 'source_location_name',
      header: 'Origin Rack / Location',
      render: (row) => (
        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.source_location_name || `Loc #${row.source_location_id}`}
        </span>
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
      header: 'Destination Rack / Location',
      render: (row) => (
        <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          {row.destination_location_name || `Loc #${row.destination_location_id}`}
        </span>
      ),
    },
    {
      key: 'items_count',
      header: 'Items',
      align: 'center',
      render: (row) => (
        <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
          {row.items?.length || 0} items
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
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
        title="Internal Stock Transfers"
        description="Relocate inventory between warehouse bays or across facilities without altering total inventory counts."
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search reference or location..."
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
            <option value="ready">Ready</option>
            <option value="done">Done (Transferred)</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyText="No transfers found matching filters."
        onRowClick={(t) => navigate(`/transfers/${t.id}`)}
      />
    </div>
  );
};
