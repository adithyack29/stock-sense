from datetime import datetime, timedelta
from sqlalchemy.orm import Session
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
    StockMovement,
)

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Product).first():
        return {"message": "Database already contains data."}

    # 1. Users
    admin_user = User(
        name="Alex Morgan",
        email="alex.morgan@stocksense.io",
        role="manager",
    )
    staff_user = User(
        name="Samira Chen",
        email="samira.chen@stocksense.io",
        role="staff",
    )
    db.add_all([admin_user, staff_user])
    db.flush()

    # 2. Warehouses
    wh_main = Warehouse(
        name="Main Distribution Hub",
        short_code="WH-MAIN",
        address="100 Logistics Blvd, North Sector",
        is_active=True,
    )
    wh_prod = Warehouse(
        name="Production & Assembly Plant",
        short_code="WH-PROD",
        address="45 Industrial Parkway, West Zone",
        is_active=True,
    )
    db.add_all([wh_main, wh_prod])
    db.flush()

    # 3. Locations
    loc_rack_a = Location(
        name="Rack A - Heavy Metals",
        short_code="LOC-RACK-A",
        warehouse_id=wh_main.id,
        is_active=True,
    )
    loc_rack_b = Location(
        name="Rack B - Electrical & Hardware",
        short_code="LOC-RACK-B",
        warehouse_id=wh_main.id,
        is_active=True,
    )
    loc_dispatch = Location(
        name="Dispatch Bay 1",
        short_code="LOC-DISPATCH",
        warehouse_id=wh_main.id,
        is_active=True,
    )
    loc_prod_floor = Location(
        name="Production Floor 1",
        short_code="LOC-PROD-FLR",
        warehouse_id=wh_prod.id,
        is_active=True,
    )
    db.add_all([loc_rack_a, loc_rack_b, loc_dispatch, loc_prod_floor])
    db.flush()

    # 4. Products
    p1 = Product(
        name="Steel Rods 12mm",
        sku="STL-ROD-012",
        category="Raw Materials",
        unit_of_measure="kg",
        initial_stock=500.0,
        reorder_level=150.0,
    )
    p2 = Product(
        name="Portland Cement 50kg",
        sku="CMT-PORT-050",
        category="Building Supplies",
        unit_of_measure="bags",
        initial_stock=200.0,
        reorder_level=50.0,
    )
    p3 = Product(
        name="Ergonomic Wooden Chairs",
        sku="FUR-CHR-W01",
        category="Furniture",
        unit_of_measure="units",
        initial_stock=45.0,
        reorder_level=20.0,
    )
    p4 = Product(
        name="Electrical Cable 3-Core (100m)",
        sku="ELE-CBL-100",
        category="Electrical",
        unit_of_measure="rolls",
        initial_stock=80.0,
        reorder_level=25.0,
    )
    p5 = Product(
        name="PVC Drainage Pipes 4in",
        sku="PIP-PVC-004",
        category="Plumbing",
        unit_of_measure="meters",
        initial_stock=120.0,
        reorder_level=40.0,
    )
    p6 = Product(
        name="Galvanized Steel Sheets 2mm",
        sku="STL-SHT-002",
        category="Raw Materials",
        unit_of_measure="sheets",
        initial_stock=15.0, # Below reorder level to demonstrate low-stock alert!
        reorder_level=30.0,
    )
    db.add_all([p1, p2, p3, p4, p5, p6])
    db.flush()

    # 5. Initial Stock Levels
    stocks = [
        Stock(product_id=p1.id, location_id=loc_rack_a.id, quantity=350.0),
        Stock(product_id=p1.id, location_id=loc_prod_floor.id, quantity=150.0),
        Stock(product_id=p2.id, location_id=loc_rack_a.id, quantity=200.0),
        Stock(product_id=p3.id, location_id=loc_dispatch.id, quantity=45.0),
        Stock(product_id=p4.id, location_id=loc_rack_b.id, quantity=80.0),
        Stock(product_id=p5.id, location_id=loc_rack_b.id, quantity=120.0),
        Stock(product_id=p6.id, location_id=loc_rack_a.id, quantity=15.0), # Alert
    ]
    db.add_all(stocks)
    db.flush()

    # 6. Sample Receipt (Completed)
    rcpt1 = Receipt(
        reference="REC-2026-0001",
        supplier="Apex Steel & Metallics Ltd.",
        date=datetime.utcnow() - timedelta(days=3),
        status="done",
        destination_location_id=loc_rack_a.id,
        notes="Q1 bulk delivery received and inspected at dock 2.",
    )
    db.add(rcpt1)
    db.flush()
    db.add(ReceiptItem(receipt_id=rcpt1.id, product_id=p1.id, quantity=350.0))
    db.add(ReceiptItem(receipt_id=rcpt1.id, product_id=p6.id, quantity=15.0))

    # Sample Receipt (Ready)
    rcpt2 = Receipt(
        reference="REC-2026-0002",
        supplier="National Cement Corp.",
        date=datetime.utcnow() - timedelta(hours=6),
        status="ready",
        destination_location_id=loc_rack_a.id,
        notes="Awaiting carrier offloading verification.",
    )
    db.add(rcpt2)
    db.flush()
    db.add(ReceiptItem(receipt_id=rcpt2.id, product_id=p2.id, quantity=100.0))

    # 7. Sample Delivery (Ready)
    deliv1 = Delivery(
        reference="DEL-2026-0001",
        customer="Horizon Commercial Contractors",
        date=datetime.utcnow() - timedelta(days=1),
        status="ready",
        source_location_id=loc_dispatch.id,
        notes="Packed for priority delivery vehicle #4.",
    )
    db.add(deliv1)
    db.flush()
    db.add(DeliveryItem(delivery_id=deliv1.id, product_id=p3.id, quantity=10.0))

    # 8. Sample Transfer (Completed)
    trans1 = InternalTransfer(
        reference="TRF-2026-0001",
        source_location_id=loc_rack_a.id,
        destination_location_id=loc_prod_floor.id,
        date=datetime.utcnow() - timedelta(days=2),
        status="done",
        notes="Transferred raw steel rods for fabrication line 1.",
    )
    db.add(trans1)
    db.flush()
    db.add(TransferItem(transfer_id=trans1.id, product_id=p1.id, quantity=150.0))

    # 9. Stock Ledger Movements
    m1 = StockMovement(
        reference=rcpt1.reference,
        movement_type="receipt",
        product_id=p1.id,
        source_location_id=None,
        destination_location_id=loc_rack_a.id,
        quantity=350.0,
        date=datetime.utcnow() - timedelta(days=3),
        user_name=admin_user.name,
        status="done",
    )
    m2 = StockMovement(
        reference=rcpt1.reference,
        movement_type="receipt",
        product_id=p6.id,
        source_location_id=None,
        destination_location_id=loc_rack_a.id,
        quantity=15.0,
        date=datetime.utcnow() - timedelta(days=3),
        user_name=admin_user.name,
        status="done",
    )
    m3 = StockMovement(
        reference=trans1.reference,
        movement_type="transfer",
        product_id=p1.id,
        source_location_id=loc_rack_a.id,
        destination_location_id=loc_prod_floor.id,
        quantity=150.0,
        date=datetime.utcnow() - timedelta(days=2),
        user_name=staff_user.name,
        status="done",
    )
    db.add_all([m1, m2, m3])

    db.commit()
    return {"message": "Database seeded successfully with initial inventory data."}
