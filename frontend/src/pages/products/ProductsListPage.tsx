import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Product } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatQuantity } from '../../utils/formatters';

export const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Raw Materials',
    unit_of_measure: 'kg',
    reorder_level: 10,
    initial_stock: 0,
  });

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError(null);
      await api.createProduct(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        sku: '',
        category: 'Raw Materials',
        unit_of_measure: 'kg',
        reorder_level: 10,
        initial_stock: 0,
      });
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product Name',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.name}</span>
          <span className="text-[11px] text-slate-400">ID #{row.id}</span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU / Code',
      render: (row) => (
        <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.sku}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {row.category}
        </span>
      ),
    },
    {
      key: 'total_stock',
      header: 'Current Stock',
      align: 'right',
      render: (row) => {
        const isLow = (row.total_stock ?? 0) <= row.reorder_level;
        return (
          <div className="text-right">
            <span
              className={`font-semibold font-mono ${
                isLow ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatQuantity(row.total_stock ?? 0, row.unit_of_measure)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'reorder_level',
      header: 'Min Reorder Threshold',
      align: 'right',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {formatQuantity(row.reorder_level, row.unit_of_measure)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (row) => {
        const isLow = (row.total_stock ?? 0) <= row.reorder_level;
        const isOut = (row.total_stock ?? 0) <= 0;
        return isOut ? (
          <Badge variant="canceled" size="sm">Out of Stock</Badge>
        ) : isLow ? (
          <Badge variant="waiting" size="sm">Low Stock</Badge>
        ) : (
          <Badge variant="done" size="sm">Optimal</Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Catalog"
        description="Master catalog of all tracked inventory items, categories, units of measure, and stock thresholds."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or SKU..."
          />
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Table
        data={filtered}
        columns={columns}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyText="No products found matching your search."
        onRowClick={(p) => navigate(`/products/${p.id}`)}
      />

      {/* Add Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Product"
        subtitle="Register a new SKU into the master inventory catalog"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateProduct}
              isLoading={isSubmitting}
            >
              Create Product
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Product Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Galvanized Steel Sheets 2mm"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Item Code"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="e.g. STL-SHT-002"
            />

            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Raw Materials', label: 'Raw Materials' },
                { value: 'Building Supplies', label: 'Building Supplies' },
                { value: 'Furniture', label: 'Furniture' },
                { value: 'Electrical', label: 'Electrical' },
                { value: 'Plumbing', label: 'Plumbing' },
                { value: 'General', label: 'General' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Unit of Measure (UoM)"
              value={formData.unit_of_measure}
              onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'bags', label: 'Bags' },
                { value: 'units', label: 'Units / Pieces' },
                { value: 'rolls', label: 'Rolls' },
                { value: 'meters', label: 'Meters' },
                { value: 'sheets', label: 'Sheets' },
              ]}
            />

            <Input
              label="Min Reorder Level"
              type="number"
              required
              min="0"
              value={formData.reorder_level}
              onChange={(e) =>
                setFormData({ ...formData, reorder_level: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
