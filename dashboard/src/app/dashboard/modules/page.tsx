'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Settings,
  Shield,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface ModuleItem {
  module: string;
  label: string;
  desc: string;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchModules = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/modules');
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules || []);
      }
    } catch (e) {
      console.error('Failed to load modules:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleToggleModule = async (moduleKey: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleKey, enabled: !currentEnabled }),
      });

      if (res.ok) {
        setModules(
          modules.map((m) =>
            m.module === moduleKey ? { ...m, enabled: !currentEnabled } : m
          )
        );
        setFeedback({
          type: 'success',
          message: `Module "${moduleKey}" status set to ${!currentEnabled ? 'ENABLED' : 'DISABLED'}.`,
        });
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to update module state' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error updating module' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Subsystem & Module Control"
        subtitle="Gateway Subsystem Power State, Health & Microservice Configuration"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
            )}
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Modules Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : modules.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No modules discovered"
            description="System module configuration list could not be acquired."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((m) => (
              <Card
                key={m.module}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <StatusDot status={m.enabled ? 'online' : 'offline'} />
                      <h4 className="text-sm font-semibold text-[#101828]">
                        {m.label}
                      </h4>
                    </div>
                    <Badge variant={m.enabled ? 'success' : 'neutral'}>
                      {m.enabled ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#667085] line-clamp-2 mb-4 leading-relaxed">
                    {m.desc}
                  </p>

                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[11px] font-mono text-[#667085] flex items-center justify-between">
                    <span>Key: {m.module}</span>
                    <span>{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : 'Active'}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#F1F3F9] flex items-center justify-between">
                  <span className="text-xs text-[#667085]">
                    State: <strong className="text-[#101828]">{m.enabled ? 'Operational' : 'Disabled'}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleModule(m.module, m.enabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      m.enabled
                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    {m.enabled ? 'Deactivate' : 'Activate Module'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
