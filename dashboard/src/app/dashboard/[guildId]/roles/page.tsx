'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input, Checkbox } from '@/components/ui/Form';
import { Table } from '@/components/ui/Table';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { RefreshCw, Shield, Plus, Pencil, Trash2, X } from 'lucide-react';

interface RoleItem {
  id: string; name: string; color: string | null; position: number; permissions: string;
  memberCount: number; isManaged: boolean; manageable: boolean;
  manageabilityReason: string | null; manageabilityMessage: string | null;
}

interface RoleForm { name: string; color: string; hoist: boolean; mentionable: boolean; permissions: string }
const blankForm: RoleForm = { name: '', color: '#5865F2', hoist: false, mentionable: false, permissions: '0' };

export default function RolesHierarchyPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const guildId = useGuildId();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(blankForm);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const requestRoles = useCallback(async () => {
    const response = await fetch(`/api/roles?guildId=${encodeURIComponent(guildId)}`, { signal: AbortSignal.timeout(20000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load roles for this server.');
    return data.roles as RoleItem[];
  }, [guildId]);

  const fetchRoles = useCallback(() => {
    setIsLoading(true);
    void requestRoles().then(setRoles).catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Unable to load roles.')).finally(() => setIsLoading(false));
  }, [requestRoles]);

  useEffect(() => {
    if (!guildId) { router.push('/dashboard/select-server'); return; }
    let active = true;
    void requestRoles().then((nextRoles) => { if (active) { setRoles(nextRoles); setLoadError(null); } }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load roles.');
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [guildId, requestRoles, router]);

  const beginEdit = (role: RoleItem) => {
    setEditingRoleId(role.id);
    setForm({ name: role.name, color: role.color || '#000000', hoist: false, mentionable: false, permissions: role.permissions });
    setActionError(null);
  };

  const submitRole = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSaving(true); setActionError(null);
    try {
      const method = editingRoleId ? 'PATCH' : 'POST';
      const response = await fetch(`/api/roles?guildId=${encodeURIComponent(guildId)}`, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, guildId, ...(editingRoleId ? { roleId: editingRoleId } : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Role operation failed.');
      setEditingRoleId(null); setForm(blankForm); fetchRoles();
    } catch (error: unknown) { setActionError(error instanceof Error ? error.message : 'Role operation failed.'); }
    finally { setIsSaving(false); }
  };

  const deleteRole = async (role: RoleItem) => {
    if (!await confirm(`Delete @${role.name}? This cannot be undone.`)) return;
    setActionError(null); setIsSaving(true);
    try {
      const response = await fetch(`/api/roles?guildId=${encodeURIComponent(guildId)}&roleId=${encodeURIComponent(role.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Role deletion failed.');
      fetchRoles();
    } catch (error: unknown) { setActionError(error instanceof Error ? error.message : 'Role deletion failed.'); }
    finally { setIsSaving(false); }
  };

  return <div className="flex-1 flex flex-col min-w-0">
    <Topbar title="Roles" subtitle="Manage Discord roles within this server’s hierarchy." actions={<Button onClick={() => { setEditingRoleId(null); setForm(blankForm); setActionError(null); }}><Plus size={16} />New role</Button>} />
    <PageContainer className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">Discord permissions and hierarchy protections remain enforced server-side.</p>
      {actionError && <div role="alert" id="role-error" className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">{actionError}</div>}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-[var(--text-primary)]">{editingRoleId ? 'Edit role' : 'Create role'}</h2><Button aria-label="Reset role form" variant="ghost" size="sm" onClick={() => { setEditingRoleId(null); setForm(blankForm); }}><X className="h-4 w-4" /></Button></div>
        <form aria-describedby={actionError ? "role-error" : undefined} onSubmit={submitRole} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-end">
          <label className="text-[13px] text-[var(--text-secondary)]">Name<Input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full" /></label>
          <label className="text-[13px] text-[var(--text-secondary)]">Color<Input type="text" pattern="#[0-9a-fA-F]{6}" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="mt-1 w-full" /></label>
          <label className="text-[13px] text-[var(--text-secondary)]">Permission bitfield<Input value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} className="mt-1 w-full" /></label>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Checkbox  checked={form.hoist} onChange={(e) => setForm({ ...form, hoist: e.target.checked })} /> Display separately</label>
          <Button type="submit" variant="primary" size="sm" disabled={isSaving} isLoading={isSaving}>{editingRoleId ? 'Save changes' : 'Create role'}</Button>
        </form>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between"><h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><Shield className="h-4 w-4 text-[var(--accent)]" /> Server hierarchy ({roles.length})</h2><Button variant="outline" size="sm" onClick={fetchRoles} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh</Button></div>
        {isLoading ? <div className="p-4"><SkeletonTable rows={8} /></div> : loadError ? <div className="p-6"><ErrorState title="Could not load roles" message={loadError} onRetry={fetchRoles} /></div> : roles.length === 0 ? <div className="p-8"><EmptyState icon={Shield} title="No roles returned" description="Discord returned no roles for this server." /></div> : <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto table-scroll"><Table className="kraxx-table"><thead><tr><th>Position</th><th>Role</th><th>Members</th><th>Management</th><th>Permissions</th><th className="text-right">Actions</th></tr></thead><tbody>{roles.map((role) => <tr key={role.id}><td className="font-mono text-[13px] text-[var(--accent)]">#{role.position}</td><td><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color || '#98A2B3' }} /><span className="text-sm font-semibold text-[var(--text-primary)]">@{role.name}</span></div></td><td className="text-sm text-[var(--text-secondary)]">{role.memberCount}</td><td>{role.manageable ? <Badge variant="success">MANAGEABLE</Badge> : <span title={role.manageabilityMessage || undefined}><Badge variant="neutral">PROTECTED</Badge></span>}</td><td className="font-mono text-[13px] text-[var(--text-secondary)]">{role.permissions}</td><td className="text-right"><div className="inline-flex gap-1"><Button variant="ghost" size="sm" disabled={!role.manageable || isSaving} title={role.manageabilityMessage || 'Edit role'} aria-label={`Edit ${role.name}`} onClick={() => beginEdit(role)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="sm" disabled={!role.manageable || isSaving} title={role.manageabilityMessage || 'Delete role'} aria-label={`Delete ${role.name}`} onClick={() => void deleteRole(role)}><Trash2 className="h-4 w-4 text-[var(--danger)]" /></Button></div></td></tr>)}</tbody></Table></div>}
      </Card>
    </PageContainer>
  </div>;
}
