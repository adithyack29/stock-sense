import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { api } from '../../api';
import { StockItem } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
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
      console.error(err);
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
          <span className="font-semibold text-slate-900 block">{row.product_name}</span>
          <span className="font-mono text-xs text-slate-400">{row.product_sku}</span>
        </div>
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
      header: 'Rack / Bay',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.location_name}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'On-Hand Stock',
      align: 'right',
      render: (row) => {
        const isLow = row.quantity <= row.reorder_level;
        return (
          <div className="text-right">
            <span
              className={`font-mono font-bold text-sm ${
                isLow ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatQuantity(row.quantity, row.unit_of_measure)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Level Status',
      render: (row) => {
        const isLow = row.quantity <= row.reorder_level;
        return isLow ? (
          <Badge variant="waiting" size="sm">
            Low Stock (&lt;={row.reorder_level})
          </Badge>
        ) : (
          <Badge variant="done" size="sm">
            Optimal
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
        description="Real-time multi-location inventory ledger displaying on-hand stock quantities per warehouse zone."
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
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
        onRowClick={(s) => navigate(`/products/${s.product_id}`)}
      />
    </div>
  );
};
