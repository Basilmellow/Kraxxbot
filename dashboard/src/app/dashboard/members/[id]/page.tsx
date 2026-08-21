'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Shield,
  ShieldCheck,
  Calendar,
  Ticket,
  CheckSquare,
  Plus,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Hash,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNewRole, setSelectedNewRole] = useState('');
  const [isMutatingRole, setIsMutatingRole] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMember = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/members/${userId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to load member profile' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error fetching member' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchMember();
  }, [userId]);

  const handleRoleAction = async (roleId: string, action: 'ADD' | 'REMOVE') => {
    setIsMutatingRole(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/members/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, action }),
      });

      const resData = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Role successfully ${action === 'ADD' ? 'assigned' : 'revoked'}.`,
        });
        setSelectedNewRole('');
        fetchMember();
      } else {
        setFeedback({ type: 'error', message: resData.error || 'Failed to update role' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error updating role' });
    } finally {
      setIsMutatingRole(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Topbar title="Member Profile" subtitle="Loading operator dossier..." />
        <div className="p-12 text-center text-xs text-[#64748b]">Loading member dossier...</div>
      </div>
    );
  }

  const member = data?.member;
  const allRoles = data?.allRoles || [];
  const assignedRoleIds = new Set(member?.roleIds || []);
  const availableRoles = allRoles.filter((r: any) => !assignedRoleIds.has(r.id));

  return (
    <div>
      <Topbar
        title={member?.displayName || 'Member Profile'}
        subtitle={`Operator Dossier • ID: ${userId}`}
        onRefresh={fetchMember}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Back navigation */}
        <Link href="/dashboard/members">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to Members</span>
          </Button>
        </Link>

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

        {/* Top Profile Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {member?.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=128`}
                  alt={member.username}
                  className="w-16 h-16 rounded-2xl border-2 border-[#00f0ff]/30 shadow-[0_0_16px_rgba(0,240,255,0.2)]"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#0f1318] border border-[#1e2a38] flex items-center justify-center text-xl font-bold text-[#00f0ff]">
                  {member?.username[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-[#e2e8f0]">{member?.displayName}</h2>
                  {member?.isVerified ? (
                    <Badge variant="success">Verified</Badge>
                  ) : (
                    <Badge variant="neutral">Unverified</Badge>
                  )}
                  {member?.department && <Badge variant="brand">{member.department}</Badge>}
                </div>
                <div className="text-xs text-[#64748b] font-mono mt-0.5">
                  @{member?.username} • ID: {member?.id}
                </div>
                <div className="text-[11px] text-[#94a3b8] flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3 text-[#64748b]" />
                  <span>Joined: {new Date(member?.joinedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0f1318] border border-[#1e2a38] text-right">
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">Assigned Tier</span>
              <span className="text-xs font-bold text-[#00f0ff] font-mono">{member?.roleTier}</span>
            </div>
          </div>
        </Card>

        {/* Roles Management Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Shield className="w-4 h-4 text-[#00f0ff]" />
              <span>Assigned Roles ({member?.roles?.length || 0})</span>
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            {/* Active Roles Pill Grid */}
            <div className="flex items-center gap-2 flex-wrap">
              {member?.roles?.map((r: any) => (
                <div
                  key={r.id}
                  className="px-2.5 py-1 rounded-lg bg-[#0f1318] border flex items-center gap-2 text-xs font-mono"
                  style={{
                    borderColor: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#1e2a38',
                  }}
                >
                  <span
                    style={{
                      color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#e2e8f0',
                    }}
                  >
                    {r.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRoleAction(r.id, 'REMOVE')}
                    disabled={isMutatingRole}
                    className="text-[#64748b] hover:text-[#ef4444] p-0.5 rounded"
                    title="Remove Role"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Role Dropdown */}
            <div className="pt-3 border-t border-[#1e2a38] flex items-center gap-2 max-w-md">
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
              >
                <option value="">Select role to assign...</option>
                {availableRoles.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => selectedNewRole && handleRoleAction(selectedNewRole, 'ADD')}
                disabled={!selectedNewRole || isMutatingRole}
                isLoading={isMutatingRole}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Assign</span>
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Activity */}
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-[#1e2a38]">
              <CardTitle>
                <Ticket className="w-4 h-4 text-[#00f0ff]" />
                <span>Ticket Activity ({data?.tickets?.length || 0})</span>
              </CardTitle>
            </div>
            <div className="divide-y divide-[#1e2a38]">
              {data?.tickets?.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748b]">No ticket history for this member.</div>
              ) : (
                data.tickets.map((t: any) => (
                  <div key={t.id} className="p-3 text-xs flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#e2e8f0]">#{t.ticketNumber} - {t.subject}</div>
                      <div className="text-[10px] text-[#64748b] font-mono">{t.category} • {new Date(t.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Badge variant={t.status === 'OPEN' ? 'warning' : t.status === 'CLAIMED' ? 'brand' : 'neutral'}>
                      {t.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Task Assignments */}
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-[#1e2a38]">
              <CardTitle>
                <CheckSquare className="w-4 h-4 text-[#00f0ff]" />
                <span>Task Assignments ({data?.tasks?.length || 0})</span>
              </CardTitle>
            </div>
            <div className="divide-y divide-[#1e2a38]">
              {data?.tasks?.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748b]">No tasks assigned or created.</div>
              ) : (
                data.tasks.map((tsk: any) => (
                  <div key={tsk.id} className="p-3 text-xs flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#e2e8f0]">{tsk.title}</div>
                      <div className="text-[10px] text-[#64748b] font-mono">{tsk.priority} Priority • {tsk.department}</div>
                    </div>
                    <Badge variant={tsk.status === 'COMPLETED' ? 'success' : tsk.status === 'IN_PROGRESS' ? 'brand' : 'neutral'}>
                      {tsk.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Moderation History */}
        {data?.moderationLogs && data.moderationLogs.length > 0 && (
          <Card className="overflow-hidden p-0 border-[#ef4444]/30">
            <div className="p-4 border-b border-[#1e2a38] bg-[#ef4444]/5">
              <CardTitle>
                <Shield className="w-4 h-4 text-[#ef4444]" />
                <span>Moderation Record ({data.moderationLogs.length})</span>
              </CardTitle>
            </div>
            <div className="divide-y divide-[#1e2a38]">
              {data.moderationLogs.map((log: any) => (
                <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[#e2e8f0]">{log.action}: {log.reason || 'No reason specified'}</div>
                    <div className="text-[10px] text-[#64748b] font-mono">Mod: {log.moderatorId} • {new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                  <Badge variant="danger">{log.action}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
