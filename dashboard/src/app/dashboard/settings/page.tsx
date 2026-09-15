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
    { id: 'GENERAL', label: 'General Subsystems' },
    { id: 'DISCORD', label: 'Discord Gateway' },
    { id: 'TICKETS', label: 'Support Tickets' },
    { id: 'MODERATION', label: 'KRAXXSEC Moderation' },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Platform Configuration Center"
        subtitle="Global Subsystem Constants, Environment Defaults & Access Control Rules"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs w-fit">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSection === s.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

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

        {/* Settings Form */}
        <form onSubmit={handleSave}>
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  {SECTIONS.find((s) => s.id === activeSection)?.label} Settings
                </h3>
              </div>
              <Badge variant="brand">FOUNDER CLEARANCE REQUIRED</Badge>
            </div>

            <div className="space-y-4 text-xs">
              {activeSection === 'GENERAL' && (
                <>
                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Organization / Platform Title
                    </label>
                    <input
                      type="text"
                      value={configs['app_name'] || 'KRAXX Operations Platform'}
                      onChange={(e) => handleChange('app_name', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Primary Guild Headquarters Discord ID
                    </label>
                    <input
                      type="text"
                      value={configs['primary_guild_id'] || ''}
                      onChange={(e) => handleChange('primary_guild_id', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </>
              )}

              {activeSection === 'DISCORD' && (
                <>
                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Global Security Log Audit Channel ID
                    </label>
                    <input
                      type="text"
                      value={configs['audit_channel_id'] || ''}
                      onChange={(e) => handleChange('audit_channel_id', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Main Broadcast Announcement Channel ID
                    </label>
                    <input
                      type="text"
                      value={configs['announcement_channel_id'] || ''}
                      onChange={(e) => handleChange('announcement_channel_id', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </>
              )}

              {activeSection === 'TICKETS' && (
                <>
                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Default Ticket Category Discord Parent Channel ID
                    </label>
                    <input
                      type="text"
                      value={configs['ticket_category_id'] || ''}
                      onChange={(e) => handleChange('ticket_category_id', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Auto-Close Inactive Ticket Timeout (Hours)
                    </label>
                    <input
                      type="number"
                      value={configs['ticket_inactivity_hours'] || '48'}
                      onChange={(e) => handleChange('ticket_inactivity_hours', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </>
              )}

              {activeSection === 'MODERATION' && (
                <>
                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Moderation Disciplinary Log Channel ID
                    </label>
                    <input
                      type="text"
                      value={configs['mod_log_channel_id'] || ''}
                      onChange={(e) => handleChange('mod_log_channel_id', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#344054] mb-1">
                      Strike Threshold for Automated Ban
                    </label>
                    <input
                      type="number"
                      value={configs['mod_ban_threshold'] || '3'}
                      onChange={(e) => handleChange('mod_ban_threshold', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-[#F1F3F9] flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                  className="font-semibold text-xs px-5"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
