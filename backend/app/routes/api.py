from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.entities import (
    User,
    Product,
    Warehouse,
    Location,
    Stock,
    Receipt,
    ReceiptItem,
    Delivery,
    DeliveryItem,
    InternalTransfer,
    TransferItem,
    StockAdjustment,
    StockMovement,
)
from app.schemas.domain import (
    ProductCreate,
    ProductResponse,
    WarehouseCreate,
    WarehouseResponse,
    LocationCreate,
    LocationResponse,
    StockResponse,
    ReceiptCreate,
    ReceiptResponse,
    ReceiptStatusUpdate,
    DeliveryCreate,
    DeliveryStatusUpdate,
    DeliveryResponse,
    TransferCreate,
    TransferStatusUpdate,
    TransferResponse,
    AdjustmentCreate,
    AdjustmentResponse,
    MovementResponse,
    DashboardMetricsResponse,
    StatusUpdate,
)
from app.services.inventory_service import InventoryService
from app.services.seed_service import seed_database

router = APIRouter(prefix="/api")

# --- System & Seed ---
@router.get("/health")
def health_check():
    return {"status": "ok", "app": "StockSense API", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()}

@router.post("/seed")
def trigger_seed(db: Session = Depends(get_db)):
    return seed_database(db)

# --- Dashboard Metrics ---
@router.get("/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard(db: Session = Depends(get_db)):
    total_products = db.query(Product).count()
    total_warehouses = db.query(Warehouse).count()
    total_locations = db.query(Location).count()

    pending_receipts = db.query(Receipt).filter(Receipt.status.in_(["draft", "ready"])).count()
    pending_deliveries = db.query(Delivery).filter(Delivery.status.in_(["draft", "waiting", "ready"])).count()
    pending_transfers = db.query(InternalTransfer).filter(InternalTransfer.status.in_(["draft", "waiting", "ready"])).count()

    # Find stock items where quantity <= reorder_level
    stocks = (
        db.query(Stock, Product, Location, Warehouse)
        .join(Product, Stock.product_id == Product.id)
        .join(Location, Stock.location_id == Location.id)
        .join(Warehouse, Location.warehouse_id == Warehouse.id)
        .all()
    )

    low_stock_list: List[StockResponse] = []
    for s, p, l, w in stocks:
        if s.quantity <= p.reorder_level:
            low_stock_list.append(StockResponse(
                id=s.id,
                product_id=p.id,
                product_name=p.name,
                product_sku=p.sku,
                location_id=l.id,
                location_name=l.name,
                warehouse_id=w.id,
                warehouse_name=w.name,
                quantity=s.quantity,
                unit_of_measure=p.unit_of_measure,
                reorder_level=p.reorder_level,
                updated_at=s.updated_at
            ))

    # Recent movements
    movements_db = (
        db.query(StockMovement)
        .order_by(StockMovement.date.desc())
        .limit(10)
        .all()
    )

    recent_movements: List[MovementResponse] = []
    for m in movements_db:
        product = db.query(Product).get(m.product_id)
        src = db.query(Location).get(m.source_location_id) if m.source_location_id else None
        dst = db.query(Location).get(m.destination_location_id) if m.destination_location_id else None

        recent_movements.append(MovementResponse(
            id=m.id,
            reference=m.reference,
            movement_type=m.movement_type,
            product_id=m.product_id,
            product_name=product.name if product else "Unknown",
            product_sku=product.sku if product else "",
            source_location_id=m.source_location_id,
            source_location_name=src.name if src else None,
            destination_location_id=m.destination_location_id,
            destination_location_name=dst.name if dst else None,
            quantity=m.quantity,
            unit_of_measure=product.unit_of_measure if product else "pcs",
            date=m.date,
            user_name=m.user_name,
            status=m.status
        ))

    return DashboardMetricsResponse(
        total_products=total_products,
        total_warehouses=total_warehouses,
        total_locations=total_locations,
        low_stock_alerts=len(low_stock_list),
        pending_receipts=pending_receipts,
        pending_deliveries=pending_deliveries,
        pending_transfers=pending_transfers,
        recent_movements=recent_movements,
        low_stock_items=low_stock_list[:5],
    )

# --- Products ---
@router.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.name).all()
    res = []
    for p in products:
        # Sum total stock across all locations
        total = db.query(func.coalesce(func.sum(Stock.quantity), 0.0)).filter(Stock.product_id == p.id).scalar()
        res.append(ProductResponse(
            id=p.id,
            name=p.name,
            sku=p.sku,
            category=p.category,
            unit_of_measure=p.unit_of_measure,
            initial_stock=p.initial_stock,
            reorder_level=p.reorder_level,
            total_stock=float(total),
            created_at=p.created_at
        ))
    return res

@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    total = db.query(func.coalesce(func.sum(Stock.quantity), 0.0)).filter(Stock.product_id == p.id).scalar()
    return ProductResponse(
        id=p.id,
        name=p.name,
        sku=p.sku,
        category=p.category,
        unit_of_measure=p.unit_of_measure,
        initial_stock=p.initial_stock,
        reorder_level=p.reorder_level,
        total_stock=float(total),
        created_at=p.created_at
    )

@router.post("/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.sku == product.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with SKU '{product.sku}' already exists.")
    
    new_product = Product(**product.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return ProductResponse(
        id=new_product.id,
        name=new_product.name,
        sku=new_product.sku,
        category=new_product.category,
        unit_of_measure=new_product.unit_of_measure,
        initial_stock=new_product.initial_stock,
        reorder_level=new_product.reorder_level,
        total_stock=0.0,
        created_at=new_product.created_at
    )

# --- Warehouses & Locations ---
@router.get("/warehouses", response_model=List[WarehouseResponse])
def get_warehouses(db: Session = Depends(get_db)):
    whs = db.query(Warehouse).order_by(Warehouse.name).all()
    res = []
    for w in whs:
        loc_count = db.query(Location).filter(Location.warehouse_id == w.id).count()
        res.append(WarehouseResponse(
            id=w.id,
            name=w.name,
            short_code=w.short_code,
            address=w.address,
            is_active=w.is_active,
            locations_count=loc_count,
            created_at=w.created_at
        ))
    return res

@router.post("/warehouses", response_model=WarehouseResponse)
def create_warehouse(warehouse: WarehouseCreate, db: Session = Depends(get_db)):
    existing = db.query(Warehouse).filter(Warehouse.short_code == warehouse.short_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse code already in use.")
    
    new_wh = Warehouse(**warehouse.model_dump())
    db.add(new_wh)
    db.commit()
    db.refresh(new_wh)
    return WarehouseResponse(
        id=new_wh.id,
        name=new_wh.name,
        short_code=new_wh.short_code,
        address=new_wh.address,
        is_active=new_wh.is_active,
        locations_count=0,
        created_at=new_wh.created_at
    )

@router.get("/locations", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    locs = db.query(Location).join(Warehouse).order_by(Location.name).all()
    res = []
    for l in locs:
        res.append(LocationResponse(
            id=l.id,
            name=l.name,
            short_code=l.short_code,
            warehouse_id=l.warehouse_id,
            warehouse_name=l.warehouse.name if l.warehouse else None,
            is_active=l.is_active,
            created_at=l.created_at
        ))
    return res

@router.post("/locations", response_model=LocationResponse)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    new_loc = Location(**location.model_dump())
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    wh = db.query(Warehouse).get(new_loc.warehouse_id)
    return LocationResponse(
        id=new_loc.id,
        name=new_loc.name,
        short_code=new_loc.short_code,
        warehouse_id=new_loc.warehouse_id,
        warehouse_name=wh.name if wh else None,
        is_active=new_loc.is_active,
        created_at=new_loc.created_at
    )

# --- Stock ---
@router.get("/stock", response_model=List[StockResponse])
def get_stock(db: Session = Depends(get_db)):
    stocks = (
        db.query(Stock, Product, Location, Warehouse)
        .join(Product, Stock.product_id == Product.id)
        .join(Location, Stock.location_id == Location.id)
        .join(Warehouse, Location.warehouse_id == Warehouse.id)
        .order_by(Product.name, Location.name)
        .all()
    )
    return [
        StockResponse(
            id=s.id,
            product_id=p.id,
            product_name=p.name,
            product_sku=p.sku,
            location_id=l.id,
            location_name=l.name,
            warehouse_id=w.id,
            warehouse_name=w.name,
            quantity=s.quantity,
            unit_of_measure=p.unit_of_measure,
            reorder_level=p.reorder_level,
            updated_at=s.updated_at
        )
        for s, p, l, w in stocks
    ]

# --- Receipts ---
@router.get("/receipts", response_model=List[ReceiptResponse])
def get_receipts(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Receipt)
    if status:
        query = query.filter(Receipt.status == status.lower().strip())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Receipt.reference.ilike(s)) | (Receipt.supplier.ilike(s)))

    receipts = query.order_by(Receipt.date.desc()).all()
    res = []
    for r in receipts:
        loc = db.query(Location).get(r.destination_location_id)
        wh = db.query(Warehouse).get(loc.warehouse_id) if loc else None
        items = []
        for itm in r.items:
            prod = db.query(Product).get(itm.product_id)
            items.append({
                "id": itm.id,
                "product_id": itm.product_id,
                "product_name": prod.name if prod else None,
                "product_sku": prod.sku if prod else None,
                "unit_of_measure": prod.unit_of_measure if prod else None,
                "quantity": itm.quantity
            })
        res.append(ReceiptResponse(
            id=r.id,
            reference=r.reference,
            supplier=r.supplier,
            date=r.date,
            status=r.status,
            notes=r.notes,
            destination_location_id=r.destination_location_id,
            destination_location_name=loc.name if loc else None,
            warehouse_id=wh.id if wh else None,
            warehouse_name=wh.name if wh else None,
            items=items,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return res

@router.get("/receipts/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Receipt not found")
    loc = db.query(Location).get(r.destination_location_id)
    wh = db.query(Warehouse).get(loc.warehouse_id) if loc else None
    items = []
    for itm in r.items:
        prod = db.query(Product).get(itm.product_id)
        items.append({
            "id": itm.id,
            "product_id": itm.product_id,
            "product_name": prod.name if prod else None,
            "product_sku": prod.sku if prod else None,
            "unit_of_measure": prod.unit_of_measure if prod else None,
            "quantity": itm.quantity
        })
    return ReceiptResponse(
        id=r.id,
        reference=r.reference,
        supplier=r.supplier,
        date=r.date,
        status=r.status,
        notes=r.notes,
        destination_location_id=r.destination_location_id,
        destination_location_name=loc.name if loc else None,
        warehouse_id=wh.id if wh else None,
        warehouse_name=wh.name if wh else None,
        items=items,
        created_at=r.created_at,
        updated_at=r.updated_at
    )

@router.post("/receipts", response_model=ReceiptResponse)
def create_receipt(receipt_in: ReceiptCreate, db: Session = Depends(get_db)):
    # 1. Validate supplier
    supplier_clean = receipt_in.supplier.strip()
    if not supplier_clean:
        raise HTTPException(status_code=400, detail="Supplier name is required and cannot be blank.")

    # 2. Validate destination location exists and is active
    loc = db.query(Location).filter(
        Location.id == receipt_in.destination_location_id,
        Location.is_active == True
    ).first()
    if not loc:
        raise HTTPException(
            status_code=400,
            detail=f"Destination location ID {receipt_in.destination_location_id} not found or inactive."
        )

    # 3. Validate items
    if not receipt_in.items or len(receipt_in.items) == 0:
        raise HTTPException(status_code=400, detail="At least one receipt line item is required.")

    # 4. Normalize and merge duplicate products
    item_map = {}
    for item in receipt_in.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Quantity for product #{item.product_id} must be strictly greater than zero."
            )
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if not prod:
            raise HTTPException(
                status_code=400,
                detail=f"Product with ID {item.product_id} does not exist in catalog."
            )
        item_map[item.product_id] = item_map.get(item.product_id, 0.0) + item.quantity

    # 5. Validate initial status
    initial_status = (receipt_in.status or "draft").lower().strip()
    if initial_status not in ["draft", "ready"]:
        raise HTTPException(
            status_code=400,
            detail=f"New receipt status can only be 'draft' or 'ready'. Received: '{initial_status}'"
        )

    # 6. Generate sequential reference
    count = db.query(Receipt).count() + 1
    ref = f"REC-{datetime.utcnow().strftime('%Y')}-{count:04d}"

    receipt = Receipt(
        reference=ref,
        supplier=supplier_clean,
        date=receipt_in.date or datetime.utcnow(),
        status=initial_status,
        destination_location_id=receipt_in.destination_location_id,
        notes=receipt_in.notes.strip() if receipt_in.notes else None
    )
    db.add(receipt)
    db.flush()

    for pid, qty in item_map.items():
        db.add(ReceiptItem(
            receipt_id=receipt.id,
            product_id=pid,
            quantity=qty
        ))

    db.commit()
    db.refresh(receipt)
    return get_receipt(receipt.id, db)

@router.patch("/receipts/{receipt_id}/status", response_model=ReceiptResponse)
@router.post("/receipts/{receipt_id}/status", response_model=ReceiptResponse)
def change_receipt_status(
    receipt_id: int,
    status_update: ReceiptStatusUpdate,
    db: Session = Depends(get_db)
):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Receipt not found")
    InventoryService.update_receipt_status(db, r, status_update.status)
    return get_receipt(r.id, db)

@router.post("/receipts/{receipt_id}/validate", response_model=ReceiptResponse)
def validate_receipt(receipt_id: int, db: Session = Depends(get_db)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Receipt not found")
    InventoryService.complete_receipt(db, r)
    return get_receipt(r.id, db)

# --- Deliveries ---
@router.get("/deliveries", response_model=List[DeliveryResponse])
def get_deliveries(
    search: Optional[str] = Query(None, description="Search by reference or customer name"),
    status: Optional[str] = Query(None, description="Filter by status (draft, waiting, ready, done, canceled)"),
    db: Session = Depends(get_db)
):
    query = db.query(Delivery)
    if status and status.strip():
        query = query.filter(Delivery.status == status.lower().strip())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter((Delivery.reference.ilike(term)) | (Delivery.customer.ilike(term)))

    deliveries = query.order_by(Delivery.date.desc()).all()
    res = []
    for d in deliveries:
        loc = db.query(Location).get(d.source_location_id)
        wh = db.query(Warehouse).get(loc.warehouse_id) if loc else None
        items = []
        for itm in d.items:
            prod = db.query(Product).get(itm.product_id)
            items.append({
                "id": itm.id,
                "product_id": itm.product_id,
                "product_name": prod.name if prod else None,
                "product_sku": prod.sku if prod else None,
                "unit_of_measure": prod.unit_of_measure if prod else None,
                "quantity": itm.quantity
            })
        res.append(DeliveryResponse(
            id=d.id,
            reference=d.reference,
            customer=d.customer,
            date=d.date,
            status=d.status,
            notes=d.notes,
            source_location_id=d.source_location_id,
            source_location_name=loc.name if loc else None,
            warehouse_id=wh.id if wh else None,
            warehouse_name=wh.name if wh else None,
            items=items,
            created_at=d.created_at,
            updated_at=d.updated_at
        ))
    return res

@router.get("/deliveries/{delivery_id}", response_model=DeliveryResponse)
def get_delivery(delivery_id: int, db: Session = Depends(get_db)):
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    loc = db.query(Location).get(d.source_location_id)
    wh = db.query(Warehouse).get(loc.warehouse_id) if loc else None
    items = []
    for itm in d.items:
        prod = db.query(Product).get(itm.product_id)
        items.append({
            "id": itm.id,
            "product_id": itm.product_id,
            "product_name": prod.name if prod else None,
            "product_sku": prod.sku if prod else None,
            "unit_of_measure": prod.unit_of_measure if prod else None,
            "quantity": itm.quantity
        })
    return DeliveryResponse(
        id=d.id,
        reference=d.reference,
        customer=d.customer,
        date=d.date,
        status=d.status,
        notes=d.notes,
        source_location_id=d.source_location_id,
        source_location_name=loc.name if loc else None,
        warehouse_id=wh.id if wh else None,
        warehouse_name=wh.name if wh else None,
        items=items,
        created_at=d.created_at,
        updated_at=d.updated_at
    )

@router.post("/deliveries", response_model=DeliveryResponse)
def create_delivery(delivery_in: DeliveryCreate, db: Session = Depends(get_db)):
    # 1. Validate customer
    customer_clean = delivery_in.customer.strip()
    if not customer_clean:
        raise HTTPException(status_code=400, detail="Customer name is required and cannot be blank.")

    # 2. Validate source location exists and is active
    loc = db.query(Location).filter(
        Location.id == delivery_in.source_location_id,
        Location.is_active == True
    ).first()
    if not loc:
        raise HTTPException(
            status_code=400,
            detail=f"Source location ID {delivery_in.source_location_id} not found or inactive."
        )

    # 3. Validate items
    if not delivery_in.items or len(delivery_in.items) == 0:
        raise HTTPException(status_code=400, detail="At least one delivery line item is required.")

    # 4. Normalize and merge duplicate products
    item_map = {}
    for item in delivery_in.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Quantity for product #{item.product_id} must be strictly greater than zero."
            )
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if not prod:
            raise HTTPException(
                status_code=400,
                detail=f"Product with ID {item.product_id} does not exist in catalog."
            )
        item_map[item.product_id] = item_map.get(item.product_id, 0.0) + item.quantity

    # 5. Validate initial status
    initial_status = (delivery_in.status or "draft").lower().strip()
    if initial_status not in ["draft", "waiting", "ready"]:
        raise HTTPException(
            status_code=400,
            detail=f"New delivery status can only be 'draft', 'waiting', or 'ready'. Received: '{initial_status}'"
        )

    # 6. Generate sequential reference OUT-YYYY-XXXX
    count = db.query(Delivery).count() + 1
    ref = f"OUT-{datetime.utcnow().strftime('%Y')}-{count:04d}"

    delivery = Delivery(
        reference=ref,
        customer=customer_clean,
        date=delivery_in.date or datetime.utcnow(),
        status=initial_status,
        source_location_id=delivery_in.source_location_id,
        notes=delivery_in.notes.strip() if delivery_in.notes else None
    )
    db.add(delivery)
    db.flush()

    for pid, qty in item_map.items():
        db.add(DeliveryItem(
            delivery_id=delivery.id,
            product_id=pid,
            quantity=qty
        ))

    db.commit()
    db.refresh(delivery)
    return get_delivery(delivery.id, db)

@router.patch("/deliveries/{delivery_id}/status", response_model=DeliveryResponse)
@router.post("/deliveries/{delivery_id}/status", response_model=DeliveryResponse)
def change_delivery_status(
    delivery_id: int,
    status_update: DeliveryStatusUpdate,
    db: Session = Depends(get_db)
):
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    InventoryService.update_delivery_status(db, d, status_update.status)
    return get_delivery(d.id, db)

@router.post("/deliveries/{delivery_id}/validate", response_model=DeliveryResponse)
def validate_delivery(delivery_id: int, db: Session = Depends(get_db)):
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    InventoryService.complete_delivery(db, d)
    return get_delivery(d.id, db)

# --- Transfers ---
# --- Transfers ---
@router.get("/transfers", response_model=List[TransferResponse])
def get_transfers(
    search: Optional[str] = Query(None, description="Search by reference or location"),
    status: Optional[str] = Query(None, description="Filter by status (draft, ready, done, canceled)"),
    db: Session = Depends(get_db)
):
    query = db.query(InternalTransfer)
    if status and status.strip():
        query = query.filter(InternalTransfer.status == status.lower().strip())
    if search and search.strip():
        term = f"%{search.strip()}%"
        # Match reference or join location names
        query = query.join(Location, InternalTransfer.source_location_id == Location.id).filter(
            (InternalTransfer.reference.ilike(term)) | (Location.name.ilike(term))
        )

    transfers = query.order_by(InternalTransfer.date.desc()).all()
    res = []
    for t in transfers:
        src = db.query(Location).get(t.source_location_id)
        dst = db.query(Location).get(t.destination_location_id)
        src_wh = db.query(Warehouse).get(src.warehouse_id) if src else None
        dst_wh = db.query(Warehouse).get(dst.warehouse_id) if dst else None

        items = []
        for itm in t.items:
            prod = db.query(Product).get(itm.product_id)
            items.append({
                "id": itm.id,
                "product_id": itm.product_id,
                "product_name": prod.name if prod else None,
                "product_sku": prod.sku if prod else None,
                "unit_of_measure": prod.unit_of_measure if prod else None,
                "quantity": itm.quantity
            })
        res.append(TransferResponse(
            id=t.id,
            reference=t.reference,
            source_location_id=t.source_location_id,
            source_location_name=src.name if src else None,
            source_warehouse_id=src_wh.id if src_wh else None,
            source_warehouse_name=src_wh.name if src_wh else None,
            destination_location_id=t.destination_location_id,
            destination_location_name=dst.name if dst else None,
            destination_warehouse_id=dst_wh.id if dst_wh else None,
            destination_warehouse_name=dst_wh.name if dst_wh else None,
            date=t.date,
            status=t.status,
            notes=t.notes,
            items=items,
            created_at=t.created_at,
            updated_at=t.updated_at
        ))
    return res

@router.get("/transfers/{transfer_id}", response_model=TransferResponse)
def get_transfer(transfer_id: int, db: Session = Depends(get_db)):
    t = db.query(InternalTransfer).filter(InternalTransfer.id == transfer_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    src = db.query(Location).get(t.source_location_id)
    dst = db.query(Location).get(t.destination_location_id)
    src_wh = db.query(Warehouse).get(src.warehouse_id) if src else None
    dst_wh = db.query(Warehouse).get(dst.warehouse_id) if dst else None

    items = []
    for itm in t.items:
        prod = db.query(Product).get(itm.product_id)
        items.append({
            "id": itm.id,
            "product_id": itm.product_id,
            "product_name": prod.name if prod else None,
            "product_sku": prod.sku if prod else None,
            "unit_of_measure": prod.unit_of_measure if prod else None,
            "quantity": itm.quantity
        })
    return TransferResponse(
        id=t.id,
        reference=t.reference,
        source_location_id=t.source_location_id,
        source_location_name=src.name if src else None,
        source_warehouse_id=src_wh.id if src_wh else None,
        source_warehouse_name=src_wh.name if src_wh else None,
        destination_location_id=t.destination_location_id,
        destination_location_name=dst.name if dst else None,
        destination_warehouse_id=dst_wh.id if dst_wh else None,
        destination_warehouse_name=dst_wh.name if dst_wh else None,
        date=t.date,
        status=t.status,
        notes=t.notes,
        items=items,
        created_at=t.created_at,
        updated_at=t.updated_at
    )

@router.post("/transfers", response_model=TransferResponse)
def create_transfer(transfer_in: TransferCreate, db: Session = Depends(get_db)):
    # 1. Validate locations
    if not transfer_in.source_location_id or not transfer_in.destination_location_id:
        raise HTTPException(status_code=400, detail="Both source and destination locations are required.")

    if transfer_in.source_location_id == transfer_in.destination_location_id:
        raise HTTPException(status_code=400, detail="Source and destination locations must be different.")

    src_loc = db.query(Location).filter(
        Location.id == transfer_in.source_location_id,
        Location.is_active == True
    ).first()
    if not src_loc:
        raise HTTPException(status_code=400, detail=f"Source location ID {transfer_in.source_location_id} not found or inactive.")

    dst_loc = db.query(Location).filter(
        Location.id == transfer_in.destination_location_id,
        Location.is_active == True
    ).first()
    if not dst_loc:
        raise HTTPException(status_code=400, detail=f"Destination location ID {transfer_in.destination_location_id} not found or inactive.")

    # 2. Validate items
    if not transfer_in.items or len(transfer_in.items) == 0:
        raise HTTPException(status_code=400, detail="At least one transfer line item is required.")

    # 3. Normalize and merge duplicate products
    item_map = {}
    for item in transfer_in.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Quantity for product #{item.product_id} must be strictly greater than zero."
            )
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if not prod:
            raise HTTPException(
                status_code=400,
                detail=f"Product with ID {item.product_id} does not exist in catalog."
            )
        item_map[item.product_id] = item_map.get(item.product_id, 0.0) + item.quantity

    # 4. Validate initial status
    initial_status = (transfer_in.status or "draft").lower().strip()
    if initial_status not in ["draft", "ready"]:
        raise HTTPException(
            status_code=400,
            detail=f"New transfer status can only be 'draft' or 'ready'. Received: '{initial_status}'"
        )

    # 5. Generate sequential reference INT-YYYY-XXXX
    count = db.query(InternalTransfer).count() + 1
    ref = f"INT-{datetime.utcnow().strftime('%Y')}-{count:04d}"

    transfer = InternalTransfer(
        reference=ref,
        source_location_id=transfer_in.source_location_id,
        destination_location_id=transfer_in.destination_location_id,
        date=transfer_in.date or datetime.utcnow(),
        status=initial_status,
        notes=transfer_in.notes.strip() if transfer_in.notes else None
    )
    db.add(transfer)
    db.flush()

    for pid, qty in item_map.items():
        db.add(TransferItem(
            transfer_id=transfer.id,
            product_id=pid,
            quantity=qty
        ))

    db.commit()
    db.refresh(transfer)
    return get_transfer(transfer.id, db)

@router.patch("/transfers/{transfer_id}/status", response_model=TransferResponse)
@router.post("/transfers/{transfer_id}/status", response_model=TransferResponse)
def change_transfer_status(
    transfer_id: int,
    status_update: TransferStatusUpdate,
    db: Session = Depends(get_db)
):
    t = db.query(InternalTransfer).filter(InternalTransfer.id == transfer_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    InventoryService.update_transfer_status(db, t, status_update.status)
    return get_transfer(t.id, db)

@router.post("/transfers/{transfer_id}/validate", response_model=TransferResponse)
def validate_transfer(transfer_id: int, db: Session = Depends(get_db)):
    t = db.query(InternalTransfer).filter(InternalTransfer.id == transfer_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    InventoryService.complete_transfer(db, t)
    return get_transfer(t.id, db)

# --- Adjustments ---
@router.get("/adjustments", response_model=List[AdjustmentResponse])
def get_adjustments(db: Session = Depends(get_db)):
    adjs = db.query(StockAdjustment).order_by(StockAdjustment.date.desc()).all()
    res = []
    for a in adjs:
        prod = db.query(Product).get(a.product_id)
        loc = db.query(Location).get(a.location_id)
        res.append(AdjustmentResponse(
            id=a.id,
            reference=a.reference,
            product_id=a.product_id,
            product_name=prod.name if prod else None,
            location_id=a.location_id,
            location_name=loc.name if loc else None,
            previous_quantity=a.previous_quantity,
            counted_quantity=a.counted_quantity,
            difference=a.difference,
            reason=a.reason,
            date=a.date,
            status=a.status,
            created_at=a.created_at
        ))
    return res

@router.post("/adjustments", response_model=AdjustmentResponse)
def create_adjustment(adj_in: AdjustmentCreate, db: Session = Depends(get_db)):
    adj = InventoryService.execute_adjustment(
        db=db,
        product_id=adj_in.product_id,
        location_id=adj_in.location_id,
        counted_qty=adj_in.counted_quantity,
        reason=adj_in.reason
    )
    prod = db.query(Product).get(adj.product_id)
    loc = db.query(Location).get(adj.location_id)
    return AdjustmentResponse(
        id=adj.id,
        reference=adj.reference,
        product_id=adj.product_id,
        product_name=prod.name if prod else None,
        location_id=adj.location_id,
        location_name=loc.name if loc else None,
        previous_quantity=adj.previous_quantity,
        counted_quantity=adj.counted_quantity,
        difference=adj.difference,
        reason=adj.reason,
        date=adj.date,
        status=adj.status,
        created_at=adj.created_at
    )

# --- Movements / Stock Ledger ---
@router.get("/movements", response_model=List[MovementResponse])
def get_movements(
    movement_type: Optional[str] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(StockMovement)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    
    movements = query.order_by(StockMovement.date.desc()).all()
    res = []
    for m in movements:
        prod = db.query(Product).get(m.product_id)
        src = db.query(Location).get(m.source_location_id) if m.source_location_id else None
        dst = db.query(Location).get(m.destination_location_id) if m.destination_location_id else None
        res.append(MovementResponse(
            id=m.id,
            reference=m.reference,
            movement_type=m.movement_type,
            product_id=m.product_id,
            product_name=prod.name if prod else "Unknown",
            product_sku=prod.sku if prod else "",
            source_location_id=m.source_location_id,
            source_location_name=src.name if src else None,
            destination_location_id=m.destination_location_id,
            destination_location_name=dst.name if dst else None,
            quantity=m.quantity,
            unit_of_measure=prod.unit_of_measure if prod else "pcs",
            date=m.date,
            user_name=m.user_name,
            status=m.status
        ))
    return res
