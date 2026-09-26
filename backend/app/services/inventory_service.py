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
    def update_receipt_status(db: Session, receipt: Receipt, new_status: str) -> Receipt:
        new_status = new_status.lower().strip()
        if receipt.status == new_status:
            return receipt

        # Check terminal statuses
        if receipt.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Receipt has already been completed and cannot change status."
            )
        if receipt.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Canceled receipt is terminal and cannot change status."
            )

        if new_status == "done":
            raise HTTPException(
                status_code=400,
                detail="Cannot directly set status to 'done'. Please use the validate endpoint to verify and receive goods."
            )

        valid_transitions = {
            "draft": ["ready", "canceled"],
            "ready": ["canceled"],
        }

        allowed = valid_transitions.get(receipt.status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{receipt.status}' to '{new_status}'. Allowed transitions: {', '.join(allowed) or 'none'}."
            )

        receipt.status = new_status
        receipt.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(receipt)
        return receipt

    @staticmethod
    def complete_receipt(db: Session, receipt: Receipt, operator_name: str = "Inventory Staff") -> Receipt:
        # 1. State machine & idempotency checks
        if receipt.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Receipt has already been processed and goods received."
            )
        if receipt.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Cannot process a canceled receipt."
            )
        if receipt.status != "ready":
            raise HTTPException(
                status_code=400,
                detail=f"Receipt must be in 'ready' status before validation (currently '{receipt.status}'). Please mark as ready first."
            )

        if not receipt.items or len(receipt.items) == 0:
            raise HTTPException(
                status_code=400,
                detail="Receipt contains no line items to receive."
            )

        # 2. Location verification
        dest_loc = db.query(Location).filter(
            Location.id == receipt.destination_location_id,
            Location.is_active == True
        ).first()
        if not dest_loc:
            raise HTTPException(
                status_code=400,
                detail=f"Destination location ID {receipt.destination_location_id} not found or inactive."
            )

        # 3. Atomic execution
        try:
            # Validate all products exist & have positive quantity before mutating anything
            for item in receipt.items:
                if item.quantity <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Item quantity must be greater than zero. Received: {item.quantity}"
                    )
                prod = db.query(Product).filter(Product.id == item.product_id).first()
                if not prod:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product with ID {item.product_id} does not exist."
                    )

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
                    user_name=operator_name,
                    status="done"
                )

            receipt.status = "done"
            receipt.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(receipt)
            return receipt
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal database error while receiving goods: {str(e)}"
            )

    @staticmethod
    def update_delivery_status(db: Session, delivery: Delivery, new_status: str) -> Delivery:
        new_status = new_status.lower().strip()
        if delivery.status == new_status:
            return delivery

        # Check terminal statuses
        if delivery.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Delivery has already been completed and cannot change status."
            )
        if delivery.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Canceled delivery is terminal and cannot change status."
            )

        if new_status == "done":
            raise HTTPException(
                status_code=400,
                detail="Cannot directly set status to 'done'. Please use the validate endpoint to verify and ship goods."
            )

        valid_transitions = {
            "draft": ["waiting", "ready", "canceled"],
            "waiting": ["ready", "canceled"],
            "ready": ["waiting", "canceled"],
        }

        allowed = valid_transitions.get(delivery.status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{delivery.status}' to '{new_status}'. Allowed transitions: {', '.join(allowed) or 'none'}."
            )

        delivery.status = new_status
        delivery.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(delivery)
        return delivery

    @staticmethod
    def complete_delivery(db: Session, delivery: Delivery, operator_name: str = "Inventory Staff") -> Delivery:
        # 1. State machine & idempotency checks
        if delivery.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Delivery has already been completed and stock has been deducted."
            )
        if delivery.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Cannot process a canceled delivery."
            )
        if delivery.status not in ["ready", "waiting"]:
            raise HTTPException(
                status_code=400,
                detail=f"Delivery must be in 'ready' status before validation (currently '{delivery.status}'). Please mark as ready first."
            )

        if not delivery.items or len(delivery.items) == 0:
            raise HTTPException(
                status_code=400,
                detail="Delivery contains no line items to ship."
            )

        # 2. Source location verification
        source_loc = db.query(Location).filter(
            Location.id == delivery.source_location_id,
            Location.is_active == True
        ).first()
        if not source_loc:
            raise HTTPException(
                status_code=400,
                detail=f"Source location ID {delivery.source_location_id} not found or inactive."
            )

        # 3. Atomic execution
        try:
            # Step A: Validate all items exist & have positive quantity; accumulate demands by product
            product_demands = {}
            for item in delivery.items:
                if item.quantity <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Item quantity must be greater than zero. Received: {item.quantity}"
                    )
                prod = db.query(Product).filter(Product.id == item.product_id).first()
                if not prod:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product with ID {item.product_id} does not exist."
                    )
                product_demands[item.product_id] = product_demands.get(item.product_id, 0.0) + item.quantity

            # Step B: Check stock availability for every product before any deduction
            for prod_id, total_needed in product_demands.items():
                stock = db.query(Stock).filter(
                    Stock.product_id == prod_id,
                    Stock.location_id == delivery.source_location_id
                ).first()
                available = stock.quantity if stock else 0.0
                if available < total_needed:
                    prod = db.query(Product).get(prod_id)
                    prod_name = prod.name if prod else f"Product #{prod_id}"
                    uom = f" {prod.unit_of_measure}" if prod and prod.unit_of_measure else ""
                    avail_str = f"{int(available) if available.is_integer() else available}{uom}"
                    req_str = f"{int(total_needed) if total_needed.is_integer() else total_needed}{uom}"
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for {prod_name}. Available: {avail_str}, requested: {req_str}."
                    )

            # Step C: All checks passed! Deduct stock and log movement for each line item
            for item in delivery.items:
                stock = db.query(Stock).filter(
                    Stock.product_id == item.product_id,
                    Stock.location_id == delivery.source_location_id
                ).first()
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
                    user_name=operator_name,
                    status="done"
                )

            delivery.status = "done"
            delivery.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(delivery)
            return delivery
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal database error while fulfilling delivery: {str(e)}"
            )

    @staticmethod
    def update_transfer_status(db: Session, transfer: InternalTransfer, new_status: str) -> InternalTransfer:
        new_status = new_status.lower().strip()
        if transfer.status == new_status:
            return transfer

        # Check terminal statuses
        if transfer.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Transfer has already been completed and cannot change status."
            )
        if transfer.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Canceled transfer is terminal and cannot change status."
            )

        if new_status == "done":
            raise HTTPException(
                status_code=400,
                detail="Cannot directly set status to 'done'. Please use the validate endpoint to execute the transfer."
            )

        valid_transitions = {
            "draft": ["ready", "canceled"],
            "ready": ["canceled"],
        }

        allowed = valid_transitions.get(transfer.status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{transfer.status}' to '{new_status}'. Allowed transitions: {', '.join(allowed) or 'none'}."
            )

        transfer.status = new_status
        transfer.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(transfer)
        return transfer

    @staticmethod
    def complete_transfer(db: Session, transfer: InternalTransfer, operator_name: str = "Inventory Staff") -> InternalTransfer:
        # 1. State machine & idempotency checks
        if transfer.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Transfer has already been completed and stock has been moved."
            )
        if transfer.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Cannot process a canceled transfer."
            )
        if transfer.status != "ready":
            raise HTTPException(
                status_code=400,
                detail=f"Transfer must be in 'ready' status before validation (currently '{transfer.status}'). Please mark as ready first."
            )

        if not transfer.items or len(transfer.items) == 0:
            raise HTTPException(
                status_code=400,
                detail="Transfer contains no line items to move."
            )

        # 2. Location checks
        if transfer.source_location_id == transfer.destination_location_id:
            raise HTTPException(
                status_code=400,
                detail="Source and destination locations must be different."
            )

        source_loc = db.query(Location).filter(
            Location.id == transfer.source_location_id,
            Location.is_active == True
        ).first()
        if not source_loc:
            raise HTTPException(
                status_code=400,
                detail=f"Source location ID {transfer.source_location_id} not found or inactive."
            )

        dest_loc = db.query(Location).filter(
            Location.id == transfer.destination_location_id,
            Location.is_active == True
        ).first()
        if not dest_loc:
            raise HTTPException(
                status_code=400,
                detail=f"Destination location ID {transfer.destination_location_id} not found or inactive."
            )

        # 3. Atomic execution
        try:
            # Step A: Pre-validation of products, quantities, and source stock availability
            product_demands = {}
            for item in transfer.items:
                if item.quantity <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Item quantity must be greater than zero. Received: {item.quantity}"
                    )
                prod = db.query(Product).filter(Product.id == item.product_id).first()
                if not prod:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product with ID {item.product_id} does not exist."
                    )
                product_demands[item.product_id] = product_demands.get(item.product_id, 0.0) + item.quantity

            # Check stock availability at source location for all demanded products
            for prod_id, total_needed in product_demands.items():
                stock = db.query(Stock).filter(
                    Stock.product_id == prod_id,
                    Stock.location_id == transfer.source_location_id
                ).first()
                available = stock.quantity if stock else 0.0
                if available < total_needed:
                    prod = db.query(Product).get(prod_id)
                    prod_name = prod.name if prod else f"Product #{prod_id}"
                    uom = f" {prod.unit_of_measure}" if prod and prod.unit_of_measure else ""
                    avail_str = f"{int(available) if available.is_integer() else available}{uom}"
                    req_str = f"{int(total_needed) if total_needed.is_integer() else total_needed}{uom}"
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for {prod_name} at {source_loc.name}. Available: {avail_str}, requested: {req_str}."
                    )

            # Step B: All checks passed! Deduct from source and credit to destination atomically
            for item in transfer.items:
                src_stock = db.query(Stock).filter(
                    Stock.product_id == item.product_id,
                    Stock.location_id == transfer.source_location_id
                ).first()
                src_stock.quantity -= item.quantity
                src_stock.updated_at = datetime.utcnow()

                dst_stock = InventoryService.get_or_create_stock(db, item.product_id, transfer.destination_location_id)
                dst_stock.quantity += item.quantity
                dst_stock.updated_at = datetime.utcnow()

                InventoryService.log_movement(
                    db=db,
                    reference=transfer.reference,
                    movement_type="transfer",
                    product_id=item.product_id,
                    quantity=item.quantity,
                    source_location_id=transfer.source_location_id,
                    destination_location_id=transfer.destination_location_id,
                    user_name=operator_name,
                    status="done"
                )

            transfer.status = "done"
            transfer.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(transfer)
            return transfer
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal database error while executing transfer: {str(e)}"
            )

    @staticmethod
    def update_adjustment_status(db: Session, adj: StockAdjustment, new_status: str) -> StockAdjustment:
        new_status = new_status.lower().strip()
        if adj.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Cannot change status of a completed adjustment."
            )
        if adj.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Cannot change status of a canceled adjustment."
            )
        if new_status == "done":
            raise HTTPException(
                status_code=400,
                detail="Cannot directly mark adjustment as done via status endpoint. Please use the validate endpoint to atomically reconcile stock."
            )
        valid_transitions = {
            "draft": ["canceled"],
        }
        allowed = valid_transitions.get(adj.status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{adj.status}' to '{new_status}'. Allowed transitions: {', '.join(allowed) or 'none'}."
            )

        adj.status = new_status
        adj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(adj)
        return adj

    @staticmethod
    def complete_adjustment(db: Session, adj: StockAdjustment, operator_name: str = "Inventory Staff") -> StockAdjustment:
        # 1. State machine & idempotency checks
        if adj.status == "done":
            raise HTTPException(
                status_code=400,
                detail="Adjustment has already been completed and stock has been reconciled."
            )
        if adj.status == "canceled":
            raise HTTPException(
                status_code=400,
                detail="Cannot validate a canceled adjustment."
            )
        if adj.status != "draft":
            raise HTTPException(
                status_code=400,
                detail=f"Adjustment must be in 'draft' status before validation (currently '{adj.status}')."
            )

        # 2. Input and entity validation
        if adj.counted_quantity is None or adj.counted_quantity < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Counted physical quantity must be greater than or equal to zero. Received: {adj.counted_quantity}"
            )

        prod = db.query(Product).filter(Product.id == adj.product_id).first()
        if not prod:
            raise HTTPException(
                status_code=400,
                detail=f"Product with ID {adj.product_id} does not exist."
            )

        loc = db.query(Location).filter(Location.id == adj.location_id, Location.is_active == True).first()
        if not loc:
            raise HTTPException(
                status_code=400,
                detail=f"Location ID {adj.location_id} not found or inactive."
            )

        # 3. Concurrent stock safety & live calculation
        try:
            stock = InventoryService.get_or_create_stock(db, adj.product_id, adj.location_id)
            prev_qty = stock.quantity
            counted_qty = adj.counted_quantity
            diff = counted_qty - prev_qty

            adj.previous_quantity = prev_qty
            adj.difference = diff
            stock.quantity = counted_qty
            stock.updated_at = datetime.utcnow()

            # Ledger entry (Option B: only log movement when diff != 0)
            if diff != 0:
                InventoryService.log_movement(
                    db=db,
                    reference=adj.reference,
                    movement_type="adjustment",
                    product_id=adj.product_id,
                    quantity=abs(diff),
                    source_location_id=adj.location_id if diff < 0 else None,
                    destination_location_id=adj.location_id if diff > 0 else None,
                    user_name=operator_name or adj.user_name or "Inventory Staff",
                    status="done"
                )

            adj.status = "done"
            adj.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(adj)
            return adj
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal database error while validating adjustment: {str(e)}"
            )

    @staticmethod
    def execute_adjustment(
        db: Session,
        product_id: int,
        location_id: int,
        counted_qty: float,
        reason: str,
        notes: Optional[str] = None,
        operator_name: str = "Inventory Staff",
        date: Optional[datetime] = None
    ) -> StockAdjustment:
        if counted_qty < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Counted physical quantity must be greater than or equal to zero. Received: {counted_qty}"
            )
        prod = db.query(Product).filter(Product.id == product_id).first()
        if not prod:
            raise HTTPException(status_code=400, detail=f"Product with ID {product_id} does not exist.")
        loc = db.query(Location).filter(Location.id == location_id, Location.is_active == True).first()
        if not loc:
            raise HTTPException(status_code=400, detail=f"Location ID {location_id} not found or inactive.")

        try:
            stock = InventoryService.get_or_create_stock(db, product_id, location_id)
            prev_qty = stock.quantity
            diff = counted_qty - prev_qty

            current_year = datetime.utcnow().strftime('%Y')
            count = db.query(StockAdjustment).count() + 1
            ref = f"ADJ-{current_year}-{count:04d}"
            while db.query(StockAdjustment).filter(StockAdjustment.reference == ref).first():
                count += 1
                ref = f"ADJ-{current_year}-{count:04d}"

            adj = StockAdjustment(
                reference=ref,
                product_id=product_id,
                location_id=location_id,
                previous_quantity=prev_qty,
                counted_quantity=counted_qty,
                difference=diff,
                reason=reason,
                notes=notes,
                date=date or datetime.utcnow(),
                status="done",
                user_name=operator_name
            )
            db.add(adj)

            # Update stock
            stock.quantity = counted_qty
            stock.updated_at = datetime.utcnow()

            # Ledger entry (Option B: only log if diff != 0)
            if diff != 0:
                InventoryService.log_movement(
                    db=db,
                    reference=ref,
                    movement_type="adjustment",
                    product_id=product_id,
                    quantity=abs(diff),
                    source_location_id=location_id if diff < 0 else None,
                    destination_location_id=location_id if diff > 0 else None,
                    user_name=operator_name,
                    status="done"
                )

            db.commit()
            db.refresh(adj)
            return adj
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal database error while executing adjustment: {str(e)}"
            )
