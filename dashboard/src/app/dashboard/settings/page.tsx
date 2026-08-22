'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Hash,
  Layers,
  Key,
  ShieldAlert,
} from 'lucide-react';

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState('GENERAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || {});
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setConfigs((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: configs }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Subsystem configuration updated successfully.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save settings' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error saving settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const SECTIONS = [
    { id: 'GENERAL', label: 'GENERAL SUBSYSTEMS' },
    { id: 'DISCORD', label: 'DISCORD GATEWAY' },
    { id: 'TICKETS', label: 'SUPPORT TICKETS' },
    { id: 'MODERATION', label: 'KRAXXSEC MODERATION' },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="PLATFORM CONFIGURATION CENTER"
        subtitle="Global Subsystem Constants, Environment Defaults & Access Control Rules"
      />

      <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded bg-[#0A0F16] border border-[#16202E] font-mono text-xs w-fit">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`px-3 py-1.5 rounded transition-all ${
                activeSection === s.id
                  ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

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

        {/* Settings Form */}
        <form onSubmit={handleSave}>
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>{activeSection} CONFIGURATION VALUES</span>
                </span>
                <Badge variant="brand">FOUNDER CLEARANCE REQUIRED</Badge>
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 font-mono text-xs pt-2">
              {activeSection === 'GENERAL' && (
                <>
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      ORGANIZATION / PLATFORM TITLE
                    </label>
                    <input
                      type="text"
                      value={configs['app_name'] || 'KRAXX Operations Platform'}
                      onChange={(e) => handleChange('app_name', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      PRIMARY GUILD HEADQUARTERS ID
                    </label>
                    <input
                      type="text"
                      value={configs['primary_guild_id'] || ''}
                      onChange={(e) => handleChange('primary_guild_id', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </>
              )}

              {activeSection === 'DISCORD' && (
                <>
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      GLOBAL LOG AUDIT CHANNEL ID
                    </label>
                    <input
                      type="text"
                      value={configs['audit_channel_id'] || ''}
                      onChange={(e) => handleChange('audit_channel_id', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      MAIN BROADCAST ANNOUNCEMENT CHANNEL ID
                    </label>
                    <input
                      type="text"
                      value={configs['announcement_channel_id'] || ''}
                      onChange={(e) => handleChange('announcement_channel_id', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </>
              )}

              {activeSection === 'TICKETS' && (
                <>
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      DEFAULT TICKET CATEGORY DISCORD PARENT ID
                    </label>
                    <input
                      type="text"
                      value={configs['ticket_category_id'] || ''}
                      onChange={(e) => handleChange('ticket_category_id', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      AUTO-CLOSE INACTIVE TICKET TIMEOUT (HOURS)
                    </label>
                    <input
                      type="number"
                      value={configs['ticket_inactivity_hours'] || '48'}
                      onChange={(e) => handleChange('ticket_inactivity_hours', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </>
              )}

              {activeSection === 'MODERATION' && (
                <>
                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      MODERATION DISCIPLINARY LOG CHANNEL ID
                    </label>
                    <input
                      type="text"
                      value={configs['mod_log_channel_id'] || ''}
                      onChange={(e) => handleChange('mod_log_channel_id', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                      STRIKE THRESHOLD FOR AUTOMATED BAN
                    </label>
                    <input
                      type="number"
                      value={configs['mod_ban_threshold'] || '3'}
                      onChange={(e) => handleChange('mod_ban_threshold', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-[#16202E] flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                  className="font-mono font-bold tracking-wider uppercase text-xs px-5"
                >
                  SAVE CONFIGURATION
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
