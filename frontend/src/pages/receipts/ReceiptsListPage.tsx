import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowDownToLine } from 'lucide-react';
import { api } from '../../api';
import { Receipt } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
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
      const data = await api.getReceipts();
      setReceipts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const filtered = receipts.filter((r) => {
    const matchesSearch =
      r.reference.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Receipt>[] = [
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
      key: 'supplier',
      header: 'Supplier / Vendor',
      render: (row) => <span className="font-medium text-slate-800">{row.supplier}</span>,
    },
    {
      key: 'destination_location_name',
      header: 'Target Bay / Rack',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.destination_location_name || `Location #${row.destination_location_id}`}
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
      header: 'Expected / Received Date',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span>,
    },
    {
      key: 'status',
      header: 'Operation Status',
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
        title="Receipt Operations"
        description="Inbound inventory receipts. Receiving goods here updates warehouse quantities and creates ledger movement logs."
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search reference or supplier..."
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
            <option value="done">Done (Received)</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyText="No receipts found matching filters."
        onRowClick={(r) => navigate(`/receipts/${r.id}`)}
      />
    </div>
  );
};
