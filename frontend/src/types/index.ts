export type StatusType = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';

export type MovementType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';

export type UserRole = 'manager' | 'staff' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_of_measure: string;
  initial_stock: number;
  reorder_level: number;
  total_stock?: number;
  created_at?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  short_code: string;
  address?: string;
  is_active: boolean;
  locations_count?: number;
}

export interface Location {
  id: number;
  name: string;
  short_code: string;
  warehouse_id: number;
  warehouse_name?: string;
  is_active: boolean;
}

export interface StockItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  location_id: number;
  location_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
  unit_of_measure: string;
  reorder_level: number;
  updated_at: string;
}

export type Stock = StockItem;

export interface ReceiptItem {
  id?: number;
  receipt_id?: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_of_measure?: string;
}

export interface Receipt {
  id: number;
  reference: string;
  supplier: string;
  date: string;
  status: StatusType;
  notes?: string;
  destination_location_id: number;
  destination_location_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  items?: ReceiptItem[];
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryItem {
  id?: number;
  delivery_id?: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_of_measure?: string;
}

export interface Delivery {
  id: number;
  reference: string;
  customer: string;
  date: string;
  status: StatusType;
  notes?: string;
  source_location_id: number;
  source_location_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  items?: DeliveryItem[];
  created_at?: string;
  updated_at?: string;
}

export interface TransferItem {
  id?: number;
  transfer_id?: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_of_measure?: string;
}

export interface InternalTransfer {
  id: number;
  reference: string;
  source_location_id: number;
  source_location_name?: string;
  source_warehouse_id?: number;
  source_warehouse_name?: string;
  destination_location_id: number;
  destination_location_name?: string;
  destination_warehouse_id?: number;
  destination_warehouse_name?: string;
  date: string;
  status: StatusType;
  notes?: string;
  items?: TransferItem[];
  created_at?: string;
  updated_at?: string;
}

export interface StockAdjustment {
  id: number;
  reference: string;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  unit_of_measure?: string;
  location_id: number;
  location_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  previous_quantity: number;
  counted_quantity: number;
  difference: number;
  reason: string;
  notes?: string;
  user_name?: string;
  date: string;
  status: StatusType;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovement {
  id: number;
  reference: string;
  movement_type: MovementType;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  source_location_id?: number | null;
  source_location_name?: string | null;
  destination_location_id?: number | null;
  destination_location_name?: string | null;
  quantity: number;
  unit_of_measure?: string;
  date: string;
  user_name?: string;
  status: string;
}

export interface DashboardMetrics {
  total_products: number;
  total_warehouses: number;
  total_locations: number;
  low_stock_alerts: number;
  pending_receipts: number;
  pending_deliveries: number;
  pending_transfers: number;
  recent_movements: StockMovement[];
  low_stock_items: StockItem[];
}
