import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Boxes,
  AlertTriangle,
  ArrowDownToLine,
  RefreshCw,
  FilterX,
  SlidersHorizontal,
  ArrowLeftRight,
} from 'lucide-react';
import { api } from '../../api';
import { StockItem, Product, Warehouse, Location } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { formatQuantity, formatDate } from '../../utils/formatters';

export const StockListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states initialized from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [warehouseFilter, setWarehouseFilter] = useState(searchParams.get('warehouse') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [productFilter, setProductFilter] = useState(searchParams.get('product') || '');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('low_stock') === 'true');

  const fetchStock = async () => {
    try {
      setIsLoading(true);
      const data = await api.getStock();
      setStocks(data);
    } catch (err) {
      console.error('Failed to load stock levels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Update query params when filters change
  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      });
      return next;
    });
  };

  // Unique filter lists derived from active stock records
  const warehouses = useMemo(
    () => Array.from(new Set(stocks.map((s) => s.warehouse_name).filter(Boolean))),
    [stocks]
  );
  const locations = useMemo(
    () => Array.from(new Set(stocks.map((s) => s.location_name).filter(Boolean))),
    [stocks]
  );
  const productNames = useMemo(
    () => Array.from(new Set(stocks.map((s) => s.product_name).filter(Boolean))),
    [stocks]
  );

  const filtered = useMemo(() => {
    return stocks.filter((s) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.product_name.toLowerCase().includes(q) ||
        s.product_sku.toLowerCase().includes(q) ||
        s.location_name.toLowerCase().includes(q) ||
        s.warehouse_name.toLowerCase().includes(q);

      const matchesWarehouse = !warehouseFilter || s.warehouse_name === warehouseFilter;
      const matchesLocation = !locationFilter || s.location_name === locationFilter;
      const matchesProduct = !productFilter || s.product_name === productFilter;
      const matchesLowStock = !lowStockOnly || s.quantity <= s.reorder_level;

      return matchesSearch && matchesWarehouse && matchesLocation && matchesProduct && matchesLowStock;
    });
  }, [stocks, search, warehouseFilter, locationFilter, productFilter, lowStockOnly]);

  const hasFilters = Boolean(
    search || warehouseFilter || locationFilter || productFilter || lowStockOnly
  );

  const handleClearFilters = () => {
    setSearch('');
    setWarehouseFilter('');
    setLocationFilter('');
    setProductFilter('');
    setLowStockOnly(false);
    setSearchParams({});
  };

  // Summary counts
  const totalStockUnits = useMemo(
    () => filtered.reduce((acc, s) => acc + s.quantity, 0),
    [filtered]
  );
  const lowStockCount = useMemo(
    () => filtered.filter((s) => s.quantity <= s.reorder_level).length,
    [filtered]
  );

  const columns: Column<StockItem>[] = [
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div>
          <Link
            to={`/products/${row.product_id}`}
            className="font-semibold text-xs text-slate-900 hover:text-indigo-600 block transition-colors"
          >
            {row.product_name}
          </Link>
          <span className="font-mono text-[10px] text-slate-400">ID #{row.product_id}</span>
        </div>
      ),
    },
    {
      key: 'product_sku',
      header: 'SKU',
      render: (row) => (
        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
          {row.product_sku}
        </span>
      ),
    },
    {
      key: 'warehouse_name',
      header: 'Warehouse',
      render: (row) => (
        <span className="font-medium text-slate-700 text-xs">{row.warehouse_name}</span>
      ),
    },
    {
      key: 'location_name',
      header: 'Location / Rack',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.location_name}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'On Hand',
      align: 'right',
      render: (row) => {
        const isLow = row.quantity <= row.reorder_level;
        const isOut = row.quantity <= 0;
        return (
          <span
            className={`font-mono font-bold text-xs ${
              isOut ? 'text-slate-400' : isLow ? 'text-rose-600 font-extrabold' : 'text-slate-900'
            }`}
          >
            {formatQuantity(row.quantity, row.unit_of_measure)}
          </span>
        );
      },
    },
    {
      key: 'reorder_level',
      header: 'Reorder Level',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">
          {formatQuantity(row.reorder_level, row.unit_of_measure)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (row) => {
        if (row.quantity <= 0) {
          return (
            <Badge variant="canceled" size="sm">
              Out of Stock
            </Badge>
          );
        }
        if (row.quantity <= row.reorder_level) {
          return (
            <Badge variant="waiting" size="sm">
              Low Stock Alert
            </Badge>
          );
        }
        return (
          <Badge variant="done" size="sm">
            In Stock
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/adjustments/new')}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />}
            className="text-xs text-slate-600 py-1 px-2 h-auto"
            title="Adjust physical stock count"
          >
            Adjust
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/transfers/new')}
            leftIcon={<ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />}
            className="text-xs text-slate-600 py-1 px-2 h-auto"
            title="Transfer stock to another location"
          >
            Transfer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & Inventory Levels"
        description="Multi-location inventory tracking displaying real-time on-hand balances across all warehouse racks."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStock}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/receipts/new')}
              leftIcon={<ArrowDownToLine className="w-3.5 h-3.5" />}
            >
              Intake Goods
            </Button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 block font-medium">Filtered Total Units</span>
          <span className="font-mono text-lg font-bold text-slate-900 block">
            {Math.round(totalStockUnits).toLocaleString()}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 block font-medium">Stock Positions</span>
          <span className="font-mono text-lg font-bold text-indigo-700 block">
            {filtered.length} locations
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 block font-medium">Low Stock Warnings</span>
          <span
            className={`font-mono text-lg font-bold block ${
              lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {lowStockCount > 0 ? `${lowStockCount} items below min` : 'Nominal (Healthy)'}
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              updateParams({ search: val || null });
            }}
            placeholder="Search product, SKU, location..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Warehouse Filter */}
          <select
            value={warehouseFilter}
            onChange={(e) => {
              const val = e.target.value;
              setWarehouseFilter(val);
              updateParams({ warehouse: val || null });
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => {
              const val = e.target.value;
              setLocationFilter(val);
              updateParams({ location: val || null });
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {/* Product Filter */}
          <select
            value={productFilter}
            onChange={(e) => {
              const val = e.target.value;
              setProductFilter(val);
              updateParams({ product: val || null });
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Products</option>
            {productNames.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Low Stock Filter Button */}
          <button
            type="button"
            onClick={() => {
              const nextVal = !lowStockOnly;
              setLowStockOnly(nextVal);
              updateParams({ low_stock: nextVal ? 'true' : null });
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              lowStockOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${lowStockOnly ? 'text-rose-600' : 'text-slate-400'}`} />
            Low Stock Only
          </button>

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

      {/* Stock Table */}
      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyText="No stock positions found matching current filters."
      />
    </div>
  );
};
