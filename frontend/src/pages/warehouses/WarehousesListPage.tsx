import React, { useEffect, useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { api } from '../../api';
import { Warehouse } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';

export const WarehousesListPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const data = await api.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortCode.trim()) return;
    try {
      setIsSubmitting(true);
      await api.createWarehouse({ name, short_code: shortCode, address, is_active: true });
      setIsModalOpen(false);
      setName('');
      setShortCode('');
      setAddress('');
      fetchWarehouses();
    } catch (err: any) {
      alert(`Failed to create warehouse: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Warehouse>[] = [
    {
      key: 'name',
      header: 'Warehouse Facility',
      render: (w) => <span className="font-semibold text-slate-900">{w.name}</span>,
    },
    {
      key: 'short_code',
      header: 'Code',
      render: (w) => (
        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
          {w.short_code}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Address / Location',
      render: (w) => <span className="text-slate-600 text-xs">{w.address || '—'}</span>,
    },
    {
      key: 'locations_count',
      header: 'Sub-Locations / Racks',
      align: 'center',
      render: (w) => (
        <span className="text-xs bg-slate-50 text-slate-700 font-medium px-2.5 py-0.5 rounded-full border border-slate-200">
          {w.locations_count || 0} racks
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Operational Status',
      render: (w) => (
        <Badge variant={w.is_active ? 'done' : 'canceled'} size="sm">
          {w.is_active ? 'Active Hub' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Hubs"
        description="Manage multi-facility distribution centers, regional depots, and production plants."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Warehouse
          </Button>
        }
      />

      <Table
        data={warehouses}
        columns={columns}
        keyExtractor={(w) => w.id}
        isLoading={isLoading}
        emptyText="No warehouses registered."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Warehouse Facility"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              isLoading={isSubmitting}
            >
              Save Warehouse
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Warehouse Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. South Transit Hub"
          />

          <Input
            label="Short Code"
            required
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value.toUpperCase())}
            placeholder="e.g. WH-SOUTH"
          />

          <Input
            label="Physical Address / Zone"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 74 Airport Logistics Park"
          />
        </form>
      </Modal>
    </div>
  );
};
