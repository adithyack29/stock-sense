import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Boxes, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('alex.morgan@stocksense.io');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('manager');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-4">
          <Boxes className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">StockSense</h2>
        <p className="mt-1 text-xs text-slate-400">Sign in to your warehouse workstation</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.morgan@stocksense.io"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Session Role Profile
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                    role === 'manager'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Inventory Manager
                </button>
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                    role === 'staff'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Warehouse Staff
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Enter StockSense
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Need access?{' '}
              <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Register workspace account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
