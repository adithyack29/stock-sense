import React from 'react';
import { User, ShieldCheck, Mail, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="User Profile"
        description="Active workstation session and inventory permissions."
      />

      <Card>
        <CardHeader title="Operator Account" />
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {user?.name.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-1">
                <Badge variant={user?.role === 'manager' ? 'done' : 'info'} size="sm">
                  {user?.role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Building className="w-4 h-4 text-slate-400" />
              <span>Primary Site: WH-MAIN (Main Distribution Hub)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Permissions: Full Inventory Operations & Ledger Auditing</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
