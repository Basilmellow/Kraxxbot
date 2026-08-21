'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Settings,
  Shield,
  Clock,
  Sparkles,
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
          message: `Module "${moduleKey}" ${!currentEnabled ? 'enabled' : 'disabled'}.`,
        });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update module state');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating module');
    }
  };

  return (
    <div>
      <Topbar
        title="Module Control Center"
        subtitle="Operational Subsystem Toggles, Health & Service Configuration"
        onRefresh={fetchModules}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Card key={mod.module} className="flex flex-col justify-between space-y-4 hover:border-[#00f0ff]/30 transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#e2e8f0]">{mod.label}</h4>
                    <span className="text-[10px] font-mono text-[#00f0ff] uppercase">{mod.module}</span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={() => handleToggleModule(mod.module, mod.enabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#1e2a38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00f0ff]"></div>
                  </label>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">{mod.desc}</p>
              </div>

              <div className="pt-3 border-t border-[#1e2a38] flex items-center justify-between text-[11px] text-[#64748b] font-mono">
                <span>State: {mod.enabled ? <strong className="text-[#10b981]">ACTIVE</strong> : 'DISABLED'}</span>
                <Link href={`/dashboard/settings`} className="text-[#00f0ff] hover:underline flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  <span>Configure</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
