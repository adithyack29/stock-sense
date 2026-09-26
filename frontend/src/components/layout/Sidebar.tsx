import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Building2,
  MapPin,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Stock Levels', href: '/stock', icon: Boxes },
    {
      name: 'Receipts',
      href: '/receipts',
      icon: ArrowDownToLine,
      subtitle: 'Inbound operations',
    },
    {
      name: 'Deliveries',
      href: '/deliveries',
      icon: ArrowUpFromLine,
      subtitle: 'Outbound operations',
    },
    {
      name: 'Transfers',
      href: '/transfers',
      icon: ArrowLeftRight,
      subtitle: 'Internal relocations',
    },
    {
      name: 'Adjustments',
      href: '/adjustments',
      icon: SlidersHorizontal,
      subtitle: 'Inventory reconciliation',
    },
    {
      name: 'Move History',
      href: '/move-history',
      icon: History,
      subtitle: 'Stock ledger',
    },
    { name: 'Warehouses', href: '/warehouses', icon: Building2 },
    { name: 'Locations', href: '/locations', icon: MapPin },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
          <Boxes className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-base tracking-tight leading-tight">
            StockSense
          </span>
          <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">
            Inventory & Logistics
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Core Operations
        </div>

        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-colors" />
              <div className="flex-1 min-w-0">
                <span className="truncate block">{item.name}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* User & Role Footprint */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-xs">
            {user?.name.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] text-slate-400 capitalize">{user?.role} Access</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
