import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api';
import { StockAdjustment } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';

export const AdjustmentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdjustments();
      setAdjustments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const filtered = adjustments.filter((a) => {
    return (
      a.reference.toLowerCase().includes(search.toLowerCase()) ||
      (a.product_name && a.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (a.reason && a.reason.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const columns: Column<StockAdjustment>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800">{row.reference}</span>
      ),
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => <span className="font-medium text-slate-900">{row.product_name}</span>,
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
      key: 'previous_quantity',
      header: 'System Qty',
      align: 'right',
      render: (row) => <span className="font-mono text-slate-500">{row.previous_quantity}</span>,
    },
    {
      key: 'counted_quantity',
      header: 'Physical Count',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">{row.counted_quantity}</span>
      ),
    },
    {
      key: 'difference',
      header: 'Discrepancy / Variance',
      align: 'right',
      render: (row) => {
        const isNeg = row.difference < 0;
        return (
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
              isNeg ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {row.difference > 0 ? `+${row.difference}` : row.difference}
          </span>
        );
      },
    },
    {
      key: 'reason',
      header: 'Audited Reason',
      render: (row) => <span className="text-xs text-slate-600 italic">{row.reason}</span>,
    },
    {
      key: 'date',
      header: 'Date Counted',
      render: (row) => <span className="text-xs text-slate-400">{formatDate(row.date)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Physical stock count reconciliation. Recording counts updates location stock balances and logs variance audit entries."
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

      <div className="w-full sm:w-72">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by reference, product, or reason..."
        />
      </div>

      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        emptyText="No stock adjustments found."
      />
    </div>
  );
};
