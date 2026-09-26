import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Filter, FilterX } from 'lucide-react';
import { api } from '../../api';
import { StockMovement } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Button } from '../../components/common/Button';
import { MovementBadge } from '../../components/common/Badge';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const MoveHistoryListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialType = searchParams.get('type') || '';

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState(initialType);

  const fetchMovements = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMovements({
        movement_type: typeFilter || undefined,
      });
      setMovements(data);
    } catch (err) {
      console.error('Failed to load ledger movements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [typeFilter]);

  const filtered = movements.filter((m) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      m.reference.toLowerCase().includes(q) ||
      (m.product_name && m.product_name.toLowerCase().includes(q)) ||
      (m.product_sku && m.product_sku.toLowerCase().includes(q)) ||
      (m.destination_location_name && m.destination_location_name.toLowerCase().includes(q))
    );
  });

  const hasFilters = Boolean(search || typeFilter);

  const handleClearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setSearchParams({});
  };

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
            <span className="text-slate-400 italic">
              {row.movement_type === 'adjustment' ? 'Reconciliation' : 'Supplier / Inbound'}
            </span>
          )}
          <span className="mx-2 text-slate-400 font-bold">→</span>
          {row.destination_location_name ? (
            <span className="font-mono text-indigo-700 font-medium">
              {row.destination_location_name}
            </span>
          ) : (
            <span className="text-slate-400 italic">
              {row.movement_type === 'adjustment' ? 'Inventory Variance' : 'Customer / Outbound'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Movement Quantity',
      align: 'right',
      render: (row) => {
        const isNegative =
          row.movement_type === 'delivery' ||
          (row.movement_type === 'adjustment' && row.source_location_name && !row.destination_location_name);
        return (
          <span
            className={`font-mono font-bold text-xs ${
              isNegative ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {isNegative ? '-' : '+'}
            {formatQuantity(row.quantity, row.unit_of_measure)}
          </span>
        );
      },
    },
    {
      key: 'user_name',
      header: 'Operator',
      render: (row) => (
        <span className="text-xs text-slate-600">{row.user_name || 'Staff Member'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Audited (Done)
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Move History & Ledger"
        description="Immutable audit trail of all verified stock movements: supplier receipts, customer deliveries, transfers, and adjustments."
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              if (val) setSearchParams({ search: val, ...(typeFilter ? { type: typeFilter } : {}) });
              else setSearchParams(typeFilter ? { type: typeFilter } : {});
            }}
            placeholder="Search reference, product, SKU..."
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              const val = e.target.value;
              setTypeFilter(val);
              if (val) setSearchParams({ type: val, ...(search ? { search } : {}) });
              else setSearchParams(search ? { search } : {});
            }}
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Movement Types</option>
            <option value="receipt">Receipts (+In)</option>
            <option value="delivery">Deliveries (-Out)</option>
            <option value="transfer">Transfers (Relocate)</option>
            <option value="adjustment">Adjustments (Reconcile)</option>
          </select>

          {hasFilters && (
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
