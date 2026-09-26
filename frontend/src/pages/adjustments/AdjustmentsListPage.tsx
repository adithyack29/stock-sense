import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, SlidersHorizontal, FilterX, Eye, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import { StockAdjustment, Product } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { formatDate, formatQuantity } from '../../utils/formatters';

export const AdjustmentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [productFilter, setProductFilter] = useState<number | ''>(
    searchParams.get('product_id') ? Number(searchParams.get('product_id')) : ''
  );

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      const [adjList, prodList] = await Promise.all([
        api.getAdjustments({
          status: statusFilter || undefined,
          product_id: productFilter !== '' ? Number(productFilter) : undefined,
          search: search.trim() || undefined,
        }),
        api.getProducts(),
      ]);
      setAdjustments(adjList);
      setProducts(prodList);
    } catch (err) {
      console.error('Failed to load stock adjustments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [statusFilter, productFilter]);

  const handleSearchSubmit = () => {
    fetchAdjustments();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setProductFilter('');
    setSearchParams({});
    api.getAdjustments().then((data) => setAdjustments(data));
  };

  const hasFilters = Boolean(search || statusFilter || productFilter !== '');

  const columns: Column<StockAdjustment>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono font-semibold text-indigo-700 hover:text-indigo-900">
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
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">{row.product_name}</span>
          {row.product_sku && (
            <span className="font-mono text-[11px] text-slate-400 block">{row.product_sku}</span>
          )}
        </div>
      ),
    },
    {
      key: 'location_name',
      header: 'Location',
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-slate-700 font-medium block">
            {row.location_name}
          </span>
          {row.warehouse_name && (
            <span className="text-[11px] text-slate-400 block">{row.warehouse_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'previous_quantity',
      header: 'System Qty',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {formatQuantity(row.previous_quantity, row.unit_of_measure)}
        </span>
      ),
    },
    {
      key: 'counted_quantity',
      header: 'Physical Count',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-xs text-slate-900">
          {formatQuantity(row.counted_quantity, row.unit_of_measure)}
        </span>
      ),
    },
    {
      key: 'difference',
      header: 'Difference',
      align: 'right',
      render: (row) => {
        const diff = row.difference;
        const isPos = diff > 0;
        const isNeg = diff < 0;
        return (
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded text-xs inline-block ${
              isPos
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isNeg
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isPos ? `+${diff}` : diff}
          </span>
        );
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <div className="max-w-xs">
          <span className="text-xs text-slate-700 font-medium block truncate">{row.reason}</span>
          {row.notes && (
            <span className="text-[11px] text-slate-400 italic block truncate">
              {row.notes}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === 'draft' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/adjustments/${row.id}`)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
              className="text-xs font-semibold hover:border-indigo-400 py-1 px-2.5 h-auto"
            >
              Validate
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/adjustments/${row.id}`)}
              leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
              className="text-xs text-slate-600 py-1 px-2.5 h-auto"
            >
              View
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Physical inventory count verification and stock reconciliation. Reconciling counts records differences in the Stock Movement ledger."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/adjustments/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Stock Adjustment
          </Button>
        }
      />

      {/* Filter and Search Bar Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
            }}
            placeholder="Search reference, reason, notes..."
          />
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              setStatusFilter(val);
              setSearchParams((prev) => {
                const updated = new URLSearchParams(prev);
                if (val) updated.set('status', val);
                else updated.delete('status');
                return updated;
              });
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft (Pending)</option>
            <option value="done">Done (Verified)</option>
            <option value="canceled">Canceled</option>
          </select>

          {/* Product Filter */}
          <select
            value={productFilter}
            onChange={(e) => {
              const val = e.target.value;
              setProductFilter(val === '' ? '' : Number(val));
              setSearchParams((prev) => {
                const updated = new URLSearchParams(prev);
                if (val) updated.set('product_id', val);
                else updated.delete('product_id');
                return updated;
              });
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} [{p.sku}]
              </option>
            ))}
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
        data={adjustments}
        columns={columns}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        onRowClick={(a) => navigate(`/adjustments/${a.id}`)}
        emptyText="No stock adjustments found matching criteria."
      />
    </div>
  );
};
