import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Building2,
  TrendingUp,
  History,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { api } from '../api';
import { DashboardMetrics } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge, MovementBadge } from '../components/common/Badge';
import { Table, Column } from '../components/common/Table';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/common/Button';
import { formatDate, formatQuantity } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <LoadingState message="Connecting to StockSense engine..." />;
  }

  if (error || !metrics) {
    return (
      <ErrorState
        title="Could not load dashboard"
        message={error || 'Unable to connect to the backend server.'}
        onRetry={fetchDashboard}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Real-time warehouse metrics, pending stock operations, and inventory movement logs."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/receipts')}
              leftIcon={<ArrowDownToLine className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Receipts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/deliveries')}
              leftIcon={<ArrowUpFromLine className="w-3.5 h-3.5 text-blue-600" />}
            >
              Deliveries
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/transfers')}
              leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
            >
              Transfers
            </Button>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Catalog Products"
          value={metrics.total_products}
          subtitle="Active SKUs tracked"
          icon={<Package className="w-5 h-5 text-indigo-600" />}
          onClick={() => navigate('/products')}
        />

        <StatCard
          title="Low Stock Alerts"
          value={metrics.low_stock_alerts}
          subtitle="Items below reorder point"
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          trend={{
            value: metrics.low_stock_alerts > 0 ? 'Action Needed' : 'Nominal',
            isAlert: metrics.low_stock_alerts > 0,
            isPositive: metrics.low_stock_alerts === 0,
          }}
          onClick={() => navigate('/stock')}
        />

        <StatCard
          title="Pending Inbound Receipts"
          value={metrics.pending_receipts}
          subtitle="Waiting / ready inspection"
          icon={<ArrowDownToLine className="w-5 h-5 text-emerald-600" />}
          onClick={() => navigate('/receipts')}
        />

        <StatCard
          title="Pending Deliveries"
          value={metrics.pending_deliveries}
          subtitle="Ready for dispatch"
          icon={<ArrowUpFromLine className="w-5 h-5 text-blue-600" />}
          onClick={() => navigate('/deliveries')}
        />
      </div>

      {/* Operational Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts Table */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Low Stock Warnings</span>
                </div>
              }
              action={
                <Link
                  to="/stock"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  View All Stock →
                </Link>
              }
            />
            <CardBody className="p-0">
              {metrics.low_stock_items.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  All stock items are currently above their reorder thresholds.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {metrics.low_stock_items.map((item) => (
                    <li key={item.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{item.product_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.location_name} • {item.warehouse_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-600">
                          {formatQuantity(item.quantity, item.unit_of_measure)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Min: {item.reorder_level} {item.unit_of_measure}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Quick Operations Navigation */}
          <Card>
            <CardHeader title="Operational Shortcuts" />
            <CardBody className="space-y-2">
              <Link
                to="/receipts"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ↓
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block">Receipt Operations</span>
                    <span className="text-[11px] text-slate-500">Receive supplier shipments into inventory</span>
                  </div>
                </div>
                <span className="text-slate-400 font-bold">→</span>
              </Link>

              <Link
                to="/deliveries"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    ↑
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block">Delivery Operations</span>
                    <span className="text-[11px] text-slate-500">Fulfill and pick outgoing orders</span>
                  </div>
                </div>
                <span className="text-slate-400 font-bold">→</span>
              </Link>

              <Link
                to="/transfers"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    ⇄
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block">Internal Transfers</span>
                    <span className="text-[11px] text-slate-500">Relocate goods between racks or warehouses</span>
                  </div>
                </div>
                <span className="text-slate-400 font-bold">→</span>
              </Link>
            </CardBody>
          </Card>
        </div>

        {/* Recent Stock Movements / Ledger */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent Stock Ledger Movements"
              subtitle="Latest audited stock transactions across all facilities"
              action={
                <Link
                  to="/move-history"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Full History →
                </Link>
              }
            />
            <CardBody className="p-0">
              <Table
                keyExtractor={(row) => row.id}
                emptyText="No recent stock movements recorded."
                data={metrics.recent_movements}
                columns={[
                  {
                    key: 'date',
                    header: 'Date & Time',
                    render: (row) => formatDate(row.date),
                  },
                  {
                    key: 'reference',
                    header: 'Reference',
                    render: (row) => (
                      <span className="font-mono font-medium text-slate-800">
                        {row.reference}
                      </span>
                    ),
                  },
                  {
                    key: 'movement_type',
                    header: 'Type',
                    render: (row) => <MovementBadge type={row.movement_type} />,
                  },
                  {
                    key: 'product_name',
                    header: 'Product',
                    render: (row) => (
                      <div>
                        <span className="font-medium text-slate-900 block">{row.product_name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{row.product_sku}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'route',
                    header: 'Route',
                    render: (row) => (
                      <div className="text-[11px] text-slate-600">
                        {row.source_location_name ? (
                          <span className="text-slate-500">{row.source_location_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Supplier</span>
                        )}
                        <span className="mx-1 text-slate-400">→</span>
                        {row.destination_location_name ? (
                          <span className="text-slate-700 font-medium">{row.destination_location_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Customer</span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'quantity',
                    header: 'Quantity',
                    align: 'right',
                    render: (row) => (
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatQuantity(row.quantity, row.unit_of_measure)}
                      </span>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
