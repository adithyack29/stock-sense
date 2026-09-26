import React, { useEffect, useState } from 'react';
import { History, Filter } from 'lucide-react';
import { api } from '../../api';
import { StockMovement } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { MovementBadge } from '../../components/common/Badge';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const MoveHistoryListPage: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchMovements = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMovements();
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const filtered = movements.filter((m) => {
    const matchesSearch =
      m.reference.toLowerCase().includes(search.toLowerCase()) ||
      (m.product_name && m.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (m.product_sku && m.product_sku.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !typeFilter || m.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const columns: Column<StockMovement>[] = [
    {
      key: 'date',
      header: 'Timestamp',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.date)}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800">{row.reference}</span>
      ),
    },
    {
      key: 'movement_type',
      header: 'Operation Type',
      render: (row) => <MovementBadge type={row.movement_type} />,
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.product_name}</span>
          <span className="font-mono text-xs text-slate-400">{row.product_sku}</span>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Source → Destination',
      render: (row) => (
        <div className="text-xs">
          {row.source_location_name ? (
            <span className="font-mono text-slate-600">{row.source_location_name}</span>
          ) : (
            <span className="text-slate-400 italic">Inbound / Supplier</span>
          )}
          <span className="mx-2 text-slate-400 font-bold">→</span>
          {row.destination_location_name ? (
            <span className="font-mono text-indigo-700 font-medium">
              {row.destination_location_name}
            </span>
          ) : (
            <span className="text-slate-400 italic">Outbound / Customer</span>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Movement Quantity',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          {formatQuantity(row.quantity, row.unit_of_measure)}
        </span>
      ),
    },
    {
      key: 'user_name',
      header: 'Operator',
      render: (row) => (
        <span className="text-xs text-slate-600">{row.user_name || 'System'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Move History & Ledger"
        description="Immutable audit log of all inventory transactions: receipts, deliveries, internal transfers, and physical adjustments."
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search reference, product, SKU..."
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Movement Types</option>
            <option value="receipt">Receipts (+In)</option>
            <option value="delivery">Deliveries (-Out)</option>
            <option value="transfer">Transfers (Relocate)</option>
            <option value="adjustment">Adjustments (Reconcile)</option>
          </select>
        </div>
      </div>

      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
        emptyText="No ledger movements found matching filters."
      />
    </div>
  );
};
