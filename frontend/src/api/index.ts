import { request } from './client';
import {
  Product,
  Warehouse,
  Location,
  StockItem,
  Receipt,
  Delivery,
  InternalTransfer,
  StockAdjustment,
  StockMovement,
  DashboardMetrics,
} from '../types';

export const api = {
  // System
  checkHealth: () => request<{ status: string }>('/health'),
  seedDatabase: () => request<{ message: string }>('/seed', { method: 'POST' }),

  // Dashboard
  getDashboardMetrics: () => request<DashboardMetrics>('/dashboard'),

  // Products
  getProducts: () => request<Product[]>('/products'),
  getProduct: (id: number) => request<Product>(`/products/${id}`),
  createProduct: (data: Partial<Product>) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Warehouses
  getWarehouses: () => request<Warehouse[]>('/warehouses'),
  createWarehouse: (data: Partial<Warehouse>) =>
    request<Warehouse>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Locations
  getLocations: () => request<Location[]>('/locations'),
  createLocation: (data: Partial<Location>) =>
    request<Location>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Stock
  getStock: () => request<StockItem[]>('/stock'),

  // Receipts
  getReceipts: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    const query = searchParams.toString();
    return request<Receipt[]>(`/receipts${query ? `?${query}` : ''}`);
  },
  getReceipt: (id: number) => request<Receipt>(`/receipts/${id}`),
  createReceipt: (data: any) =>
    request<Receipt>('/receipts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateReceiptStatus: (id: number, status: string) =>
    request<Receipt>(`/receipts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  validateReceipt: (id: number) =>
    request<Receipt>(`/receipts/${id}/validate`, {
      method: 'POST',
    }),

  // Deliveries
  getDeliveries: (params?: { search?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    return request<Delivery[]>(`/deliveries${query ? `?${query}` : ''}`);
  },
  getDelivery: (id: number) => request<Delivery>(`/deliveries/${id}`),
  createDelivery: (data: any) =>
    request<Delivery>('/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDeliveryStatus: (id: number, status: string) =>
    request<Delivery>(`/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  validateDelivery: (id: number) =>
    request<Delivery>(`/deliveries/${id}/validate`, {
      method: 'POST',
    }),

  // Transfers
  getTransfers: () => request<InternalTransfer[]>('/transfers'),
  getTransfer: (id: number) => request<InternalTransfer>(`/transfers/${id}`),
  createTransfer: (data: any) =>
    request<InternalTransfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  validateTransfer: (id: number) =>
    request<InternalTransfer>(`/transfers/${id}/validate`, {
      method: 'POST',
    }),

  // Adjustments
  getAdjustments: () => request<StockAdjustment[]>('/adjustments'),
  createAdjustment: (data: any) =>
    request<StockAdjustment>('/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Movements / Ledger
  getMovements: (params?: { movement_type?: string; product_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.movement_type) searchParams.append('movement_type', params.movement_type);
    if (params?.product_id) searchParams.append('product_id', params.product_id.toString());
    const query = searchParams.toString();
    return request<StockMovement[]>(`/movements${query ? `?${query}` : ''}`);
  },
};
