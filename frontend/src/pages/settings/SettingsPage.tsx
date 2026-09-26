import React, { useState } from 'react';
import { Settings, Database, RefreshCw, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { api } from '../../api';

export const SettingsPage: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleResetData = async () => {
    try {
      setIsSeeding(true);
      await api.seedDatabase(true);
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 2500);
    } catch (err: any) {
      alert(`Seed failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="System Settings"
        description="Configure workspace preferences, warehouse defaults, and demo database state."
      />

      <Card>
        <CardHeader
          title="Demo Data & Testing Utilities"
          subtitle="Reset or populate realistic hackathon seed dataset"
        />
        <CardBody className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Quickly initialize or reset the SQLite database with realistic inventory records
            including steel, building materials, multi-warehouse structures, and traceable ledger
            movements.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetData}
              isLoading={isSeeding}
              leftIcon={
                seedSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                )
              }
            >
              {seedSuccess ? 'Seeded Successfully!' : 'Trigger Demo Data Seed'}
            </Button>
            {seedSuccess && (
              <span className="text-xs text-emerald-600 font-medium">
                Initial records populated into SQLite database!
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="System Architecture Info" />
        <CardBody className="space-y-3 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">API Backend</span>
            <span className="font-mono font-medium text-slate-800">FastAPI 0.128 + Uvicorn</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Database Layer</span>
            <span className="font-mono font-medium text-slate-800">SQLite 3 (ACID Relational Engine)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Frontend Client</span>
            <span className="font-mono font-medium text-slate-800">React 19 + TypeScript + Tailwind CSS</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-500">Data Flow Engine</span>
            <span className="font-mono font-medium text-indigo-700">Validated Stock Ledger Service</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
