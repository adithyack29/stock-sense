import React, { useState } from 'react';
import { Menu, Database, RefreshCw, UserCheck, LogOut, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Button } from '../common/Button';

interface TopBarProps {
  onToggleMobileNav: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileNav }) => {
  const { user, switchRole, logout } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await api.seedDatabase();
      setSeedSuccess(true);
      setTimeout(() => {
        setSeedSuccess(false);
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Failed to seed:', err);
      alert('Seeding failed. Make sure backend is running.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile menu button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-800">Workspace:</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200">
            Active Hub (WH-MAIN)
          </span>
        </div>
      </div>

      {/* Right Controls: Seed Data, Role Switcher, Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Seed Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          isLoading={isSeeding}
          leftIcon={
            seedSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            )
          }
          className="text-xs"
          title="Reset database to realistic sample data for demo"
        >
          {seedSuccess ? 'Seeded!' : 'Demo Data'}
        </Button>

        {/* Role Switcher */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
          <button
            onClick={() => switchRole('manager')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              user?.role === 'manager'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => switchRole('staff')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              user?.role === 'staff'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Staff
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</span>
            <span className="text-[10px] text-slate-400 capitalize">{user?.role}</span>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
