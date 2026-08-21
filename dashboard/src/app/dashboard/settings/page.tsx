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
        setFeedback({ type: 'success', message: 'Operational settings saved successfully.' });
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
    { id: 'GENERAL', label: 'General' },
    { id: 'DISCORD', label: 'Discord' },
    { id: 'TICKETS', label: 'Tickets' },
    { id: 'MODERATION', label: 'Moderation' },
    { id: 'TASKS', label: 'Tasks' },
  ];

  return (
    <div>
      <Topbar
        title="Platform Configuration Center"
        subtitle="Global Subsystem Constants, Environment Defaults & Security Settings"
        onRefresh={fetchSettings}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section Navigation */}
          <div className="lg:col-span-3 space-y-1">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between border ${
                  activeSection === sec.id
                    ? 'bg-[#00f0ff] text-[#0a0e15] border-[#00f0ff]'
                    : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                <span>{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="lg:col-span-9">
            <form onSubmit={handleSave} className="space-y-4">
              <Card className="space-y-4">
                <CardHeader>
                  <CardTitle>
                    <Settings className="w-4 h-4 text-[#00f0ff]" />
                    <span>{activeSection} Configuration Parameters</span>
                  </CardTitle>
                </CardHeader>

                {activeSection === 'GENERAL' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Organization Name</label>
                      <input
                        type="text"
                        value={configs['ORG_NAME'] || 'KRAXX Operations'}
                        onChange={(e) => handleChange('ORG_NAME', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Primary Timezone</label>
                      <input
                        type="text"
                        value={configs['TIMEZONE'] || 'UTC'}
                        onChange={(e) => handleChange('TIMEZONE', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'DISCORD' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Command Prefix (Fallback)</label>
                      <input
                        type="text"
                        value={configs['BOT_PREFIX'] || '!'}
                        onChange={(e) => handleChange('BOT_PREFIX', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Default Embed Color</label>
                      <input
                        type="text"
                        value={configs['EMBED_COLOR'] || '#00f0ff'}
                        onChange={(e) => handleChange('EMBED_COLOR', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'TICKETS' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Max Open Tickets Per User</label>
                      <input
                        type="number"
                        value={configs['TICKETS_MAX_PER_USER'] || '3'}
                        onChange={(e) => handleChange('TICKETS_MAX_PER_USER', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'MODERATION' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Default Timeout Duration (Seconds)</label>
                      <input
                        type="number"
                        value={configs['MOD_DEFAULT_TIMEOUT'] || '3600'}
                        onChange={(e) => handleChange('MOD_DEFAULT_TIMEOUT', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'TASKS' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Task Number Prefix</label>
                      <input
                        type="text"
                        value={configs['TASK_PREFIX'] || 'TSK'}
                        onChange={(e) => handleChange('TASK_PREFIX', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#1e2a38] flex justify-end">
                  <Button type="submit" variant="primary" isLoading={isSaving}>
                    <Save className="w-4 h-4 mr-1.5" />
                    <span>Save {activeSection} Settings</span>
                  </Button>
                </div>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
