import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Boxes, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { UserRole } from '../types';
import { api } from '../api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('alex.morgan@stocksense.io');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('manager');

  // OTP Password Reset State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpEmail, setOtpEmail] = useState('alex.morgan@stocksense.io');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, role);
    navigate('/dashboard');
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsOtpSubmitting(true);
      setOtpError(null);
      const res = await api.requestOtp(otpEmail);
      setGeneratedOtp(res.otp);
      setEnteredOtp(res.otp); // Pre-fill for hackathon convenience
      setOtpStep(2);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to request OTP');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsOtpSubmitting(true);
      setOtpError(null);
      await api.resetPassword({
        email: otpEmail,
        otp: enteredOtp,
        new_password: newPassword,
      });
      setOtpSuccess('Password successfully reset! Logging you in...');
      setTimeout(() => {
        setIsOtpModalOpen(false);
        login(otpEmail, role);
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to verify OTP and reset password');
    } finally {
      setIsOtpSubmitting(false);
    }
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

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setOtpEmail(email);
                  setIsOtpModalOpen(true);
                  setOtpStep(1);
                  setOtpError(null);
                  setOtpSuccess(null);
                  setGeneratedOtp(null);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Forgot password? Reset via OTP
              </button>
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

      {/* OTP Password Reset Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">OTP-Based Password Reset</h3>
            <p className="text-xs text-slate-500 mt-1">
              Recover your warehouse workstation account using a secure 6-digit one-time passcode.
            </p>

            {otpError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {otpError}
              </div>
            )}

            {otpSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                {otpSuccess}
              </div>
            )}

            {otpStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="mt-4 space-y-4">
                <Input
                  label="Registered Work Email"
                  type="email"
                  required
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder="alex.morgan@stocksense.io"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOtpModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isOtpSubmitting}
                  >
                    Send One-Time Passcode
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="mt-4 space-y-3.5">
                {generatedOtp && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                    <span className="font-semibold block">Demo Security OTP Generated:</span>
                    <span className="font-mono text-base font-bold text-indigo-700 tracking-wider">
                      {generatedOtp}
                    </span>
                    <p className="text-[11px] text-indigo-600 mt-0.5">
                      Use this passcode below to complete your reset.
                    </p>
                  </div>
                )}

                <Input
                  label="6-Digit OTP Code"
                  required
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="e.g. 592814"
                />

                <Input
                  label="New Password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOtpStep(1)}
                  >
                    ← Back
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsOtpModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isOtpSubmitting}
                    >
                      Reset & Sign In
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
