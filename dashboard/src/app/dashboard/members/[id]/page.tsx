'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
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
  ExternalLink,
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
          message: `Role ${action === 'ADD' ? 'assigned' : 'revoked'} successfully.`,
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
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="PERSONNEL DOSSIER" subtitle="Retrieving telemetry..." />
        <div className="p-12 text-center font-mono text-xs text-[#64748B]">
          ACQUIRING OPERATOR DOSSIER TELEMETRY...
        </div>
      </div>
    );
  }

  const member = data?.member;
  const allRoles = data?.allRoles || [];
  const assignedRoleIds = new Set(member?.roleIds || []);
  const availableRoles = allRoles.filter((r: any) => !assignedRoleIds.has(r.id));

  if (!member) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="PERSONNEL DOSSIER" subtitle="Operator Not Found" />
        <div className="p-8 max-w-lg mx-auto">
          <EmptyState
            icon={Users}
            title="OPERATOR NOT FOUND"
            description="The requested user ID could not be resolved within the Discord guild."
            action={
              <Link href="/dashboard/members">
                <Button variant="outline" size="sm" className="font-mono text-xs">
                  RETURN TO DIRECTORY
                </Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title={`OPERATOR DOSSIER // ${member.displayName || member.username}`}
        subtitle={`Discord ID: ${member.id} • Clearance Tier: ${member.roleTier}`}
      />

      <div className="p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/members">
            <Button variant="ghost" size="sm" className="font-mono text-xs gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO DIRECTORY</span>
            </Button>
          </Link>
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

        {/* Profile Card */}
        <Card className="bg-[#0A0F16]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-2">
            <div className="flex items-center gap-4">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt=""
                  className="w-16 h-16 rounded-md object-cover border border-[#16202E]"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-[#070B10] flex items-center justify-center font-bold text-[#22D3EE] text-xl border border-[#16202E]">
                  {member.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-mono font-bold text-[#F1F5F9]">
                    {member.displayName || member.username}
                  </h2>
                  <Badge
                    variant={
                      member.roleTier === 'FOUNDER' || member.roleTier === 'COFOUNDER'
                        ? 'brand'
                        : member.roleTier === 'MANAGEMENT_HEAD'
                        ? 'studio'
                        : 'neutral'
                    }
                  >
                    {member.roleTier}
                  </Badge>
                </div>
                <div className="text-xs font-mono text-[#64748B] mt-0.5">
                  @{member.username} • ID: {member.id}
                </div>
                <div className="text-[10px] font-mono text-[#475569] mt-1 flex items-center gap-2">
                  <span>Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Guild Member: Active</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Grid: Role Management & Operational History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Assigned Roles Management */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>ASSIGNED GUILD ROLES ({member.roles?.length || 0})</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 font-mono text-xs">
              {/* Role Chips */}
              <div className="flex flex-wrap gap-1.5">
                {member.roles?.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070B10] border border-[#16202E] text-[#F1F5F9]"
                  >
                    <span>{r.name}</span>
                    <button
                      type="button"
                      disabled={isMutatingRole}
                      onClick={() => handleRoleAction(r.id, 'REMOVE')}
                      className="text-[#64748B] hover:text-[#EF4444] transition-colors"
                      title="Revoke Role"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Assign New Role */}
              <div className="pt-3 border-t border-[#16202E]">
                <label className="block text-[10px] text-[#64748B] uppercase mb-1.5">
                  ASSIGN ADDITIONAL GUILD ROLE
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedNewRole}
                    onChange={(e) => setSelectedNewRole(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  >
                    <option value="">Select Discord role to grant...</option>
                    {availableRoles.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedNewRole || isMutatingRole}
                    isLoading={isMutatingRole}
                    onClick={() => handleRoleAction(selectedNewRole, 'ADD')}
                    className="font-mono text-xs"
                  >
                    GRANT ROLE
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Operational Ticket History */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>OPERATIONAL TICKET HISTORY ({data?.tickets?.length || 0})</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-2 font-mono text-xs max-h-60 overflow-y-auto pr-1">
              {!data?.tickets || data.tickets.length === 0 ? (
                <div className="text-center py-6 text-[#64748B]">No tickets recorded for operator.</div>
              ) : (
                data.tickets.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded bg-[#070B10] border border-[#16202E]"
                  >
                    <div>
                      <div className="font-bold text-[#F1F5F9]">Ticket #{t.ticketNumber}</div>
                      <div className="text-[10px] text-[#64748B]">{t.subject}</div>
                    </div>
                    <Badge variant={t.status === 'OPEN' ? 'warning' : 'neutral'}>
                      {t.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
