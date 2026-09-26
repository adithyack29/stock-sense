from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# Base & Shared
class StatusUpdate(BaseModel):
    status: str

# Product Schemas
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    sku: str = Field(..., min_length=1, max_length=50)
    category: str = Field(default="General")
    unit_of_measure: str = Field(default="pcs")
    initial_stock: float = Field(default=0.0, ge=0.0)
    reorder_level: float = Field(default=10.0, ge=0.0)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    total_stock: float = 0.0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Warehouse & Location Schemas
class WarehouseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    short_code: str = Field(..., min_length=1, max_length=20)
    address: Optional[str] = None
    is_active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseResponse(WarehouseBase):
    id: int
    locations_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    short_code: str = Field(..., min_length=1, max_length=30)
    warehouse_id: int
    is_active: bool = True

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    id: int
    warehouse_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Stock Schemas
class StockResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_sku: str
    location_id: int
    location_name: str
    warehouse_id: int
    warehouse_name: str
    quantity: float
    unit_of_measure: str
    reorder_level: float
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Items
class DocumentItem(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)

class DocumentItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    unit_of_measure: Optional[str] = None
    quantity: float

    class Config:
        from_attributes = True

# Receipts
class ReceiptCreate(BaseModel):
    supplier: str = Field(..., min_length=1, max_length=150)
    destination_location_id: int
    notes: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = Field(default="draft")
    items: List[DocumentItem] = Field(..., min_length=1)

class ReceiptStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)

class ReceiptResponse(BaseModel):
    id: int
    reference: str
    supplier: str
    date: datetime
    status: str
    notes: Optional[str] = None
    destination_location_id: int
    destination_location_name: Optional[str] = None
    warehouse_id: Optional[int] = None
    warehouse_name: Optional[str] = None
    items: List[DocumentItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Deliveries
class DeliveryCreate(BaseModel):
    customer: str = Field(..., min_length=1, max_length=150)
    source_location_id: int
    notes: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = Field(default="draft")
    items: List[DocumentItem] = Field(..., min_length=1)

class DeliveryStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)

class DeliveryResponse(BaseModel):
    id: int
    reference: str
    customer: str
    date: datetime
    status: str
    notes: Optional[str] = None
    source_location_id: int
    source_location_name: Optional[str] = None
    warehouse_id: Optional[int] = None
    warehouse_name: Optional[str] = None
    items: List[DocumentItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Internal Transfers
class TransferCreate(BaseModel):
    source_location_id: int
    destination_location_id: int
    notes: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = Field(default="draft")
    items: List[DocumentItem] = Field(..., min_length=1)

class TransferStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)

class TransferResponse(BaseModel):
    id: int
    reference: str
    source_location_id: int
    source_location_name: Optional[str] = None
    source_warehouse_id: Optional[int] = None
    source_warehouse_name: Optional[str] = None
    destination_location_id: int
    destination_location_name: Optional[str] = None
    destination_warehouse_id: Optional[int] = None
    destination_warehouse_name: Optional[str] = None
    date: datetime
    status: str
    notes: Optional[str] = None
    items: List[DocumentItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Adjustments
class AdjustmentCreate(BaseModel):
    product_id: int
    location_id: int
    counted_quantity: float = Field(..., ge=0)
    reason: str = Field(..., min_length=1)
    notes: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = Field(default="done") # "draft" or "done"

class AdjustmentStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)

class AdjustmentResponse(BaseModel):
    id: int
    reference: str
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    unit_of_measure: Optional[str] = None
    location_id: int
    location_name: Optional[str] = None
    warehouse_id: Optional[int] = None
    warehouse_name: Optional[str] = None
    previous_quantity: float
    counted_quantity: float
    difference: float
    reason: str
    notes: Optional[str] = None
    user_name: Optional[str] = None
    date: datetime
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Movements / Ledger
class MovementResponse(BaseModel):
    id: int
    reference: str
    movement_type: str
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    source_location_id: Optional[int] = None
    source_location_name: Optional[str] = None
    destination_location_id: Optional[int] = None
    destination_location_name: Optional[str] = None
    quantity: float
    unit_of_measure: Optional[str] = None
    date: datetime
    user_name: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

# Dashboard
class DashboardMetricsResponse(BaseModel):
    total_products: int
    total_stock_quantity: float = 0.0
    total_warehouses: int
    total_locations: int
    low_stock_alerts: int
    pending_receipts: int
    pending_deliveries: int
    pending_transfers: int
    pending_adjustments: int = 0
    recent_movements: List[MovementResponse] = []
    low_stock_items: List[StockResponse] = []
