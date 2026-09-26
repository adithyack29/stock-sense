import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

// Auth Pages
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';

// Main Pages
import { DashboardPage } from '../pages/DashboardPage';
import { ProductsListPage } from '../pages/products/ProductsListPage';
import { ProductDetailPage } from '../pages/products/ProductDetailPage';
import { StockListPage } from '../pages/stock/StockListPage';

// Operations Pages
import { ReceiptsListPage } from '../pages/receipts/ReceiptsListPage';
import { ReceiptDetailPage } from '../pages/receipts/ReceiptDetailPage';
import { NewReceiptPage } from '../pages/receipts/NewReceiptPage';

import { DeliveriesListPage } from '../pages/deliveries/DeliveriesListPage';
import { DeliveryDetailPage } from '../pages/deliveries/DeliveryDetailPage';
import { NewDeliveryPage } from '../pages/deliveries/NewDeliveryPage';

import { TransfersListPage } from '../pages/transfers/TransfersListPage';
import { TransferDetailPage } from '../pages/transfers/TransferDetailPage';
import { NewTransferPage } from '../pages/transfers/NewTransferPage';

import { AdjustmentsListPage } from '../pages/adjustments/AdjustmentsListPage';
import { AdjustmentDetailPage } from '../pages/adjustments/AdjustmentDetailPage';
import { NewAdjustmentPage } from '../pages/adjustments/NewAdjustmentPage';

// Ledger & Infrastructure
import { MoveHistoryListPage } from '../pages/movements/MoveHistoryListPage';
import { WarehousesListPage } from '../pages/warehouses/WarehousesListPage';
import { LocationsListPage } from '../pages/locations/LocationsListPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { ProfilePage } from '../pages/profile/ProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Main Authenticated Application Layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Products */}
        <Route path="/products" element={<ProductsListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />

        {/* Stock */}
        <Route path="/stock" element={<StockListPage />} />

        {/* Receipts (Section 4: Click 'Receipt Operations' -> list view first) */}
        <Route path="/receipts" element={<ReceiptsListPage />} />
        <Route path="/receipts/new" element={<NewReceiptPage />} />
        <Route path="/receipts/:id" element={<ReceiptDetailPage />} />

        {/* Deliveries (Section 4: Click 'Delivery Operations' -> list view first) */}
        <Route path="/deliveries" element={<DeliveriesListPage />} />
        <Route path="/deliveries/new" element={<NewDeliveryPage />} />
        <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />

        {/* Internal Transfers */}
        <Route path="/transfers" element={<TransfersListPage />} />
        <Route path="/transfers/new" element={<NewTransferPage />} />
        <Route path="/transfers/:id" element={<TransferDetailPage />} />

        {/* Stock Adjustments */}
        <Route path="/adjustments" element={<AdjustmentsListPage />} />
        <Route path="/adjustments/new" element={<NewAdjustmentPage />} />
        <Route path="/adjustments/:id" element={<AdjustmentDetailPage />} />

        {/* Move History / Ledger (Section 4: Click 'Move History' -> list view first) */}
        <Route path="/move-history" element={<MoveHistoryListPage />} />

        {/* Warehouses & Locations */}
        <Route path="/warehouses" element={<WarehousesListPage />} />
        <Route path="/warehouses/new" element={<WarehousesListPage />} />
        <Route path="/warehouses/:id" element={<WarehousesListPage />} />

        <Route path="/locations" element={<LocationsListPage />} />
        <Route path="/locations/new" element={<LocationsListPage />} />
        <Route path="/locations/:id" element={<LocationsListPage />} />

        {/* Settings & Profile */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
