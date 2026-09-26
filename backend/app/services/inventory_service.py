from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models.entities import (
    Stock,
    StockMovement,
    Product,
    Warehouse,
    Location,
    Receipt,
    Delivery,
    InternalTransfer,
    StockAdjustment,
)

class InventoryService:

    @staticmethod
    def get_or_create_stock(db: Session, product_id: int, location_id: int) -> Stock:
        stock = db.query(Stock).filter(
            Stock.product_id == product_id,
            Stock.location_id == location_id
        ).first()

        if not stock:
            stock = Stock(product_id=product_id, location_id=location_id, quantity=0.0)
            db.add(stock)
            db.flush()
        return stock

    @staticmethod
    def log_movement(
        db: Session,
        reference: str,
        movement_type: str,
        product_id: int,
        quantity: float,
        source_location_id: Optional[int] = None,
        destination_location_id: Optional[int] = None,
        user_name: str = "Inventory Staff",
        status: str = "done",
    ) -> StockMovement:
        movement = StockMovement(
            reference=reference,
            movement_type=movement_type,
            product_id=product_id,
            source_location_id=source_location_id,
            destination_location_id=destination_location_id,
            quantity=quantity,
            user_name=user_name,
            status=status,
            date=datetime.utcnow()
        )
        db.add(movement)
        return movement

    @staticmethod
    def complete_receipt(db: Session, receipt: Receipt) -> Receipt:
        if receipt.status == "done":
            raise HTTPException(status_code=400, detail="Receipt has already been processed.")
        if receipt.status == "canceled":
            raise HTTPException(status_code=400, detail="Cannot process a canceled receipt.")

        # Increase stock at destination location for each item & log movement
        for item in receipt.items:
            stock = InventoryService.get_or_create_stock(db, item.product_id, receipt.destination_location_id)
            stock.quantity += item.quantity
            stock.updated_at = datetime.utcnow()

            InventoryService.log_movement(
                db=db,
                reference=receipt.reference,
                movement_type="receipt",
                product_id=item.product_id,
                quantity=item.quantity,
                source_location_id=None,
                destination_location_id=receipt.destination_location_id,
                status="done"
            )

        receipt.status = "done"
        db.commit()
        db.refresh(receipt)
        return receipt

    @staticmethod
    def complete_delivery(db: Session, delivery: Delivery) -> Delivery:
        if delivery.status == "done":
            raise HTTPException(status_code=400, detail="Delivery order has already been processed.")
        if delivery.status == "canceled":
            raise HTTPException(status_code=400, detail="Cannot process a canceled delivery.")

        # Validate stock availability
        for item in delivery.items:
            stock = db.query(Stock).filter(
                Stock.product_id == item.product_id,
                Stock.location_id == delivery.source_location_id
            ).first()

            available = stock.quantity if stock else 0.0
            if available < item.quantity:
                product = db.query(Product).get(item.product_id)
                prod_name = product.name if product else f"Product #{item.product_id}"
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{prod_name}'. Available: {available}, Required: {item.quantity}"
                )

        # Decrease stock & log movement
        for item in delivery.items:
            stock = InventoryService.get_or_create_stock(db, item.product_id, delivery.source_location_id)
            stock.quantity -= item.quantity
            stock.updated_at = datetime.utcnow()

            InventoryService.log_movement(
                db=db,
                reference=delivery.reference,
                movement_type="delivery",
                product_id=item.product_id,
                quantity=item.quantity,
                source_location_id=delivery.source_location_id,
                destination_location_id=None,
                status="done"
            )

        delivery.status = "done"
        db.commit()
        db.refresh(delivery)
        return delivery

    @staticmethod
    def complete_transfer(db: Session, transfer: InternalTransfer) -> InternalTransfer:
        if transfer.status == "done":
            raise HTTPException(status_code=400, detail="Transfer has already been processed.")
        if transfer.status == "canceled":
            raise HTTPException(status_code=400, detail="Cannot process a canceled transfer.")

        if transfer.source_location_id == transfer.destination_location_id:
            raise HTTPException(status_code=400, detail="Source and destination locations cannot be identical.")

        # Validate stock at source location
        for item in transfer.items:
            stock = db.query(Stock).filter(
                Stock.product_id == item.product_id,
                Stock.location_id == transfer.source_location_id
            ).first()

            available = stock.quantity if stock else 0.0
            if available < item.quantity:
                product = db.query(Product).get(item.product_id)
                prod_name = product.name if product else f"Product #{item.product_id}"
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock at source for '{prod_name}'. Available: {available}, Required: {item.quantity}"
                )

        # Move stock from source to destination
        for item in transfer.items:
            src_stock = InventoryService.get_or_create_stock(db, item.product_id, transfer.source_location_id)
            dst_stock = InventoryService.get_or_create_stock(db, item.product_id, transfer.destination_location_id)

            src_stock.quantity -= item.quantity
            dst_stock.quantity += item.quantity
            src_stock.updated_at = datetime.utcnow()
            dst_stock.updated_at = datetime.utcnow()

            InventoryService.log_movement(
                db=db,
                reference=transfer.reference,
                movement_type="transfer",
                product_id=item.product_id,
                quantity=item.quantity,
                source_location_id=transfer.source_location_id,
                destination_location_id=transfer.destination_location_id,
                status="done"
            )

        transfer.status = "done"
        db.commit()
        db.refresh(transfer)
        return transfer

    @staticmethod
    def execute_adjustment(db: Session, product_id: int, location_id: int, counted_qty: float, reason: str) -> StockAdjustment:
        stock = InventoryService.get_or_create_stock(db, product_id, location_id)
        prev_qty = stock.quantity
        diff = counted_qty - prev_qty

        # Generate unique reference
        count = db.query(StockAdjustment).count() + 1
        ref = f"ADJ-{datetime.utcnow().strftime('%Y%m')}-{count:04d}"

        adj = StockAdjustment(
            reference=ref,
            product_id=product_id,
            location_id=location_id,
            previous_quantity=prev_qty,
            counted_quantity=counted_qty,
            difference=diff,
            reason=reason,
            date=datetime.utcnow(),
            status="done"
        )
        db.add(adj)

        # Update stock
        stock.quantity = counted_qty
        stock.updated_at = datetime.utcnow()

        # Log movement
        InventoryService.log_movement(
            db=db,
            reference=ref,
            movement_type="adjustment",
            product_id=product_id,
            quantity=abs(diff),
            source_location_id=location_id if diff < 0 else None,
            destination_location_id=location_id if diff > 0 else None,
            status="done"
        )

        db.commit()
        db.refresh(adj)
        return adj
