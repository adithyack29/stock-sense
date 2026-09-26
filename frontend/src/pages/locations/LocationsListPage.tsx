import React, { useEffect, useState } from 'react';
import { Plus, MapPin } from 'lucide-react';
import { api } from '../../api';
import { Location, Warehouse } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

export const LocationsListPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [locs, whs] = await Promise.all([api.getLocations(), api.getWarehouses()]);
      setLocations(locs);
      setWarehouses(whs);
      if (whs.length > 0) setWarehouseId(whs[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortCode.trim() || !warehouseId) return;
    try {
      setIsSubmitting(true);
      await api.createLocation({
        name,
        short_code: shortCode,
        warehouse_id: Number(warehouseId),
        is_active: true,
      });
      setIsModalOpen(false);
      setName('');
      setShortCode('');
      fetchData();
    } catch (err: any) {
      alert(`Failed to create location: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Location>[] = [
    {
      key: 'name',
      header: 'Location / Rack / Zone',
      render: (loc) => <span className="font-semibold text-slate-900">{loc.name}</span>,
    },
    {
      key: 'short_code',
      header: 'Bin Code',
      render: (loc) => (
        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
          {loc.short_code}
        </span>
      ),
    },
    {
      key: 'warehouse_name',
      header: 'Parent Warehouse',
      render: (loc) => (
        <span className="text-slate-700 font-medium text-xs">
          {loc.warehouse_name || `Warehouse #${loc.warehouse_id}`}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (loc) => (
        <Badge variant={loc.is_active ? 'done' : 'canceled'} size="sm">
          {loc.is_active ? 'Available' : 'Disabled'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Locations & Racks"
        description="Physical bin locations, shelving racks, production staging areas, and dispatch bays."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Location
          </Button>
        }
      />

      <Table
        data={locations}
        columns={columns}
        keyExtractor={(l) => l.id}
        isLoading={isLoading}
        emptyText="No locations registered."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Storage Location"
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
              Save Location
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Location / Rack Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rack C - Chemicals"
          />

          <Input
            label="Short Bin Code"
            required
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value.toUpperCase())}
            placeholder="e.g. LOC-RACK-C"
          />

          <Select
            label="Parent Warehouse"
            required
            value={warehouseId}
            onChange={(e) => setWarehouseId(Number(e.target.value))}
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.name} (${w.short_code})`,
            }))}
          />
        </form>
      </Modal>
    </div>
  );
};
