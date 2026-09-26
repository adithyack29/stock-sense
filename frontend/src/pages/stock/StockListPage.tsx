import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Boxes, AlertTriangle, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { StockItem } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { formatQuantity, formatDate } from '../../utils/formatters';

export const StockListPage: React.FC = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

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

  const warehouses = Array.from(new Set(stocks.map((s) => s.warehouse_name)));

  const filtered = stocks.filter((s) => {
    const matchesSearch =
      s.product_name.toLowerCase().includes(search.toLowerCase()) ||
      s.product_sku.toLowerCase().includes(search.toLowerCase()) ||
      s.location_name.toLowerCase().includes(search.toLowerCase());
    const matchesWarehouse = !warehouseFilter || s.warehouse_name === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

  const columns: Column<StockItem>[] = [
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div>
          <Link
            to={`/products/${row.product_id}`}
            className="font-semibold text-slate-900 hover:text-indigo-600 block transition-colors"
          >
            {row.product_name}
          </Link>
          <span className="font-mono text-[11px] text-slate-400">ID #{row.product_id}</span>
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
            className={`font-mono font-bold text-sm ${
              isOut ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {formatQuantity(row.quantity, row.unit_of_measure)}
          </span>
        );
      },
    },
    {
      key: 'available_quantity',
      header: 'Available',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-medium text-slate-600 text-xs">
          {formatQuantity(row.quantity, row.unit_of_measure)}
        </span>
      ),
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
      header: 'Status',
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
      key: 'updated_at',
      header: 'Last Movement',
      render: (row) => (
        <span className="text-xs text-slate-400">{formatDate(row.updated_at)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock & Inventory Levels"
        description="Real-time multi-location inventory ledger displaying on-hand and available quantities per warehouse rack."
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search product, SKU, or rack..."
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyText="No stock positions found matching filters."
      />
    </div>
  );
};
