import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Building2,
  MapPin,
  Boxes,
  History,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api';
import { DashboardMetrics } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge, MovementBadge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
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
        title="Inventory Operations Dashboard"
        description="Real-time multi-location warehouse metrics, stock reconciliation, and operational audit trail."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/receipts')}
              leftIcon={<ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />}
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
              variant="outline"
              size="sm"
              onClick={() => navigate('/transfers')}
              leftIcon={<ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />}
            >
              Transfers
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/adjustments')}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              Adjustments
            </Button>
          </div>
        }
      />

      {/* Top Key Performance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Catalog Products"
          value={metrics.total_products}
          subtitle="Master SKUs active"
          icon={<Package className="w-5 h-5 text-indigo-600" />}
          onClick={() => navigate('/products')}
        />

        <StatCard
          title="Total Stock Units"
          value={Math.round(metrics.total_stock_quantity || 0).toLocaleString()}
          subtitle="Aggregate inventory on hand"
          icon={<Boxes className="w-5 h-5 text-indigo-600" />}
          onClick={() => navigate('/stock')}
        />

        <StatCard
          title="Low Stock Alerts"
          value={metrics.low_stock_alerts}
          subtitle="Items below reorder point"
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          trend={{
            value: metrics.low_stock_alerts > 0 ? `${metrics.low_stock_alerts} Urgent` : 'Healthy',
            isAlert: metrics.low_stock_alerts > 0,
            isPositive: metrics.low_stock_alerts === 0,
          }}
          onClick={() => navigate('/stock')}
        />

        <StatCard
          title="Warehouses & Hubs"
          value={metrics.total_warehouses}
          subtitle={`${metrics.total_locations} storage locations`}
          icon={<Building2 className="w-5 h-5 text-slate-700" />}
          onClick={() => navigate('/warehouses')}
        />
      </div>

      {/* Secondary Operational Pipeline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/receipts')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Pending Receipts</span>
              <span className="font-mono text-xl font-bold text-slate-900">
                {metrics.pending_receipts}
              </span>
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-medium">View →</span>
        </div>

        <div
          onClick={() => navigate('/deliveries')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Pending Deliveries</span>
              <span className="font-mono text-xl font-bold text-slate-900">
                {metrics.pending_deliveries}
              </span>
            </div>
          </div>
          <span className="text-xs text-blue-600 font-medium">View →</span>
        </div>

        <div
          onClick={() => navigate('/transfers')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Pending Transfers</span>
              <span className="font-mono text-xl font-bold text-slate-900">
                {metrics.pending_transfers}
              </span>
            </div>
          </div>
          <span className="text-xs text-purple-600 font-medium">View →</span>
        </div>
      </div>

      {/* Main Operational Section: Low Stock Alerts & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Low Stock Alerts + Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Low Stock Alerts Card (Part 3) */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Low Stock Alerts</span>
                  {metrics.low_stock_alerts > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      {metrics.low_stock_alerts}
                    </span>
                  )}
                </div>
              }
              action={
                <Link
                  to="/stock"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  View Stock <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />
            <CardBody className="p-0">
              {metrics.low_stock_items.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800">All stock levels are healthy.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    No items are currently below their configured reorder thresholds.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {metrics.low_stock_items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/stock?search=${encodeURIComponent(item.product_name)}`)}
                      className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-xs text-slate-900 block truncate group-hover:text-indigo-600 transition-colors">
                          {item.product_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 block">
                          SKU: {item.product_sku}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {item.location_name} • {item.warehouse_name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-xs text-rose-600 block">
                          {formatQuantity(item.quantity, item.unit_of_measure)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Min: {item.reorder_level} {item.unit_of_measure}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Operational Shortcuts */}
          <Card>
            <CardHeader title="Inventory Operations Shortcuts" />
            <CardBody className="space-y-2">
              <Link
                to="/receipts/new"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ↓
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block group-hover:text-emerald-700 transition-colors">
                      New Inbound Receipt
                    </span>
                    <span className="text-[11px] text-slate-500">Record incoming supplier delivery</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
              </Link>

              <Link
                to="/deliveries/new"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    ↑
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block group-hover:text-blue-700 transition-colors">
                      New Outbound Delivery
                    </span>
                    <span className="text-[11px] text-slate-500">Ship inventory to customers</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </Link>

              <Link
                to="/transfers/new"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    ⇄
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block group-hover:text-purple-700 transition-colors">
                      New Internal Transfer
                    </span>
                    <span className="text-[11px] text-slate-500">Relocate between bins/warehouses</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
              </Link>

              <Link
                to="/adjustments/new"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block group-hover:text-amber-700 transition-colors">
                      New Stock Adjustment
                    </span>
                    <span className="text-[11px] text-slate-500">Reconcile physical stock counts</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
              </Link>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Recent Stock Movements / Ledger */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent Stock Ledger Movements"
              subtitle="Latest audited stock transactions across all facilities"
              action={
                <Link
                  to="/move-history"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  Full History <ArrowRight className="w-3 h-3" />
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
                    render: (row) => (
                      <span className="text-xs text-slate-500">{formatDate(row.date)}</span>
                    ),
                  },
                  {
                    key: 'reference',
                    header: 'Reference',
                    render: (row) => (
                      <Link
                        to={`/move-history?search=${encodeURIComponent(row.reference)}`}
                        className="font-mono text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        {row.reference}
                      </Link>
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
                        <span className="font-semibold text-xs text-slate-900 block truncate max-w-[150px]">
                          {row.product_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 block">
                          {row.product_sku}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'route',
                    header: 'Route',
                    render: (row) => (
                      <div className="text-[11px] text-slate-600">
                        {row.source_location_name ? (
                          <span className="text-slate-600 font-mono">{row.source_location_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">
                            {row.movement_type === 'adjustment' ? 'Reconciliation' : 'Supplier'}
                          </span>
                        )}
                        <span className="mx-1 text-slate-400">→</span>
                        {row.destination_location_name ? (
                          <span className="text-indigo-700 font-medium font-mono">
                            {row.destination_location_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            {row.movement_type === 'adjustment' ? 'Variance' : 'Customer'}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'quantity',
                    header: 'Quantity',
                    align: 'right',
                    render: (row) => {
                      const isNegative =
                        row.movement_type === 'delivery' ||
                        (row.movement_type === 'adjustment' &&
                          row.source_location_id &&
                          !row.destination_location_id);
                      return (
                        <span
                          className={`font-semibold font-mono text-xs ${
                            isNegative ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isNegative ? '-' : '+'}
                          {formatQuantity(row.quantity, row.unit_of_measure)}
                        </span>
                      );
                    },
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
