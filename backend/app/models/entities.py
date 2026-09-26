from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    role = Column(String(50), default="staff", nullable=False) # manager, staff, admin
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(100), nullable=False, default="General")
    unit_of_measure = Column(String(30), nullable=False, default="pcs")
    initial_stock = Column(Float, default=0.0)
    reorder_level = Column(Float, default=10.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    stocks = relationship("Stock", back_populates="product", cascade="all, delete-orphan")
    movements = relationship("StockMovement", back_populates="product")

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    short_code = Column(String(20), unique=True, index=True, nullable=False)
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    locations = relationship("Location", back_populates="warehouse", cascade="all, delete-orphan")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    short_code = Column(String(30), index=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    warehouse = relationship("Warehouse", back_populates="locations")
    stocks = relationship("Stock", back_populates="location", cascade="all, delete-orphan")

class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    quantity = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="stocks")
    location = relationship("Location", back_populates="stocks")

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, index=True, nullable=False)
    supplier = Column(String(150), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="draft", nullable=False) # draft, waiting, ready, done, canceled
    destination_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    destination_location = relationship("Location")
    items = relationship("ReceiptItem", back_populates="receipt", cascade="all, delete-orphan")

class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)

    # Relationships
    receipt = relationship("Receipt", back_populates="items")
    product = relationship("Product")

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, index=True, nullable=False)
    customer = Column(String(150), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="draft", nullable=False) # draft, waiting, ready, done, canceled
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    source_location = relationship("Location")
    items = relationship("DeliveryItem", back_populates="delivery", cascade="all, delete-orphan")

class DeliveryItem(Base):
    __tablename__ = "delivery_items"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)

    # Relationships
    delivery = relationship("Delivery", back_populates="items")
    product = relationship("Product")

class InternalTransfer(Base):
    __tablename__ = "internal_transfers"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, index=True, nullable=False)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    destination_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="draft", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    source_location = relationship("Location", foreign_keys=[source_location_id])
    destination_location = relationship("Location", foreign_keys=[destination_location_id])
    items = relationship("TransferItem", back_populates="transfer", cascade="all, delete-orphan")

class TransferItem(Base):
    __tablename__ = "transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("internal_transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)

    # Relationships
    transfer = relationship("InternalTransfer", back_populates="items")
    product = relationship("Product")

class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True, index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    previous_quantity = Column(Float, nullable=False, default=0.0)
    counted_quantity = Column(Float, nullable=False, default=0.0)
    difference = Column(Float, nullable=False, default=0.0)
    reason = Column(String(255), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="done", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product")
    location = relationship("Location")

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), index=True, nullable=False)
    movement_type = Column(String(30), index=True, nullable=False) # receipt, delivery, transfer, adjustment
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    destination_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    quantity = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    user_name = Column(String(100), default="Staff Member")
    status = Column(String(30), default="done", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="movements")
    source_location = relationship("Location", foreign_keys=[source_location_id])
    destination_location = relationship("Location", foreign_keys=[destination_location_id])
