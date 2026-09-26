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
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

interface NavSection {
  title: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();

  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'INVENTORY',
      items: [
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Stock Levels', href: '/stock', icon: Boxes },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Receipts', href: '/receipts', icon: ArrowDownToLine },
        { name: 'Deliveries', href: '/deliveries', icon: ArrowUpFromLine },
        { name: 'Internal Transfers', href: '/transfers', icon: ArrowLeftRight },
        { name: 'Stock Adjustments', href: '/adjustments', icon: SlidersHorizontal },
      ],
    },
    {
      title: 'TRACKING',
      items: [
        { name: 'Move History', href: '/move-history', icon: History },
      ],
    },
    {
      title: 'CONFIGURATION',
      items: [
        { name: 'Warehouses', href: '/warehouses', icon: Building2 },
        { name: 'Locations', href: '/locations', icon: MapPin },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { name: 'Profile', href: '/profile', icon: User },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
          <Boxes className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white text-base tracking-tight leading-tight">
            StockSense
          </span>
          <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">
            Inventory System
          </span>
        </div>
      </div>

      {/* Navigation Groupings */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 transition-colors" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Session & Logout Action */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-xs shrink-0">
              {user?.name.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Staff'}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role || 'User'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              if (onCloseMobile) onCloseMobile();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Log out of session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
