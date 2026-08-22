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
        title="SUBSYSTEM & MODULE CONTROL"
        subtitle="Gateway Subsystem Power State, Health & Microservice Configuration"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded bg-[#0A0F16] border flex items-start gap-3 font-mono text-xs ${
              feedback.type === 'success'
                ? 'border-[#10B981]/40 text-[#10B981]'
                : 'border-[#EF4444]/40 text-[#EF4444]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Modules Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="NO SUBSYSTEMS REGISTERED"
            description="No controllable subsystem modules are registered in the gateway registry."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <Card
                key={mod.module}
                className={`bg-[#0A0F16] flex flex-col justify-between border transition-all p-4 space-y-3 font-mono text-xs ${
                  mod.enabled ? 'border-[#16202E] hover:border-[#22D3EE]/30' : 'border-[#16202E]/60 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot status={mod.enabled ? 'online' : 'offline'} />
                      <h3 className="font-bold text-[#F1F5F9] text-sm">{mod.label}</h3>
                    </div>
                    <Badge variant={mod.enabled ? 'brand' : 'neutral'}>
                      {mod.enabled ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                    {mod.desc}
                  </p>

                  <div className="text-[10px] text-[#64748B] pt-2 border-t border-[#16202E]">
                    IDENTIFIER: <span className="text-[#22D3EE]">{mod.module}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#16202E] flex items-center justify-between">
                  <span className="text-[10px] text-[#64748B]">
                    {mod.updatedAt ? `Updated ${new Date(mod.updatedAt).toLocaleDateString()}` : 'Default State'}
                  </span>

                  <Button
                    variant={mod.enabled ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleModule(mod.module, mod.enabled)}
                    className="font-mono text-xs py-1"
                  >
                    {mod.enabled ? 'POWER OFF' : 'ENGAGE'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
