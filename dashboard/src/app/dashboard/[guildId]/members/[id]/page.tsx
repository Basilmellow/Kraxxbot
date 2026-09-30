'use client';

import { PageContainer } from '@/components/ui/Page';
import { Select } from '@/components/ui/Form';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

import { Ticket, CheckSquare, X, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useGuildId } from '@/lib/useGuildId';

interface DossierRole {
  id: string;
  name: string;
  color: number;
  manageable: boolean;
  manageabilityReason: string | null;
}

interface DossierMember {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  joinedAt?: string | null;
  roles: DossierRole[];
  roleIds: string[];
  isVerified: boolean;
  verifiedAt: string | null;
  roleTier: string;
  department?: string | null;
}

interface DossierTask {
  id: string;
  taskNumber: number;
  title: string;
  department: string;
  priority: string;
  status: string;
}

interface DossierTicket {
  id: string;
  ticketNumber: number;
  subject: string;
  category: string;
  createdAt: string;
  status: string;
}

interface MemberDossierData {
  member: DossierMember;
  tasks: DossierTask[];
  tickets: DossierTicket[];
  allRoles: DossierRole[];
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const guildId = useGuildId();

  const [data, setData] = useState<MemberDossierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNewRole, setSelectedNewRole] = useState('');
  const [isMutatingRole, setIsMutatingRole] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMember = useCallback(async () => {
    try {
      const res = await fetch(`/api/members/${userId}?guildId=${encodeURIComponent(guildId)}`);
      if (res.ok) {
        const result = await res.json() as MemberDossierData;
        setData(result);
      } else {
        const err = await res.json() as { error?: string };
        setFeedback({ type: 'error', message: err.error || 'Failed to load member profile' });
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Error fetching member' });
    } finally {
      setIsLoading(false);
    }
  }, [guildId, userId]);

  useEffect(() => {
    if (userId) void Promise.resolve().then(fetchMember);
  }, [fetchMember]);

  const handleRoleAction = async (roleId: string, action: 'ADD' | 'REMOVE') => {
    setIsMutatingRole(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/members/${userId}/roles?guildId=${encodeURIComponent(guildId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, action, guildId }),
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
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Error updating role' });
    } finally {
      setIsMutatingRole(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Personnel Dossier" subtitle="Retrieving telemetry..." />
        <div className="p-12 text-center text-[13px] text-[var(--text-secondary)]">
          Loading operator dossier profile...
        </div>
      </div>
    );
  }

  const member = data?.member;
  const assignedRoleIds = new Set<string>(member?.roleIds || []);
  const roleReason = (role: DossierRole) => {
    switch (role.manageabilityReason) {
      case 'EVERYONE': return 'Everyone role';
      case 'MANAGED': return 'Managed role';
      case 'ABOVE_BOT_ROLE': return 'Above bot role';
      case 'MISSING_MANAGE_ROLES': return 'Bot lacks Manage Roles';
      default: return role.manageable ? 'Assignable' : 'Not manageable';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title={`Personnel Dossier: ${member?.displayName || userId}`}
        subtitle="Operational Profile, Discord Hierarchy & System Activity"
      />

      <PageContainer className="space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href={`/dashboard/${guildId}/members`}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Personnel Directory</span>
          </Link>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-[13px] ${
              feedback.type === 'success'
                ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]'
                : 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--success)]" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--danger)]" />
            )}
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profile Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6 ">
              <div className="flex items-center gap-4 pb-5 border-b border-[var(--border-base)]">
                {member?.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.displayName}
                    className="w-16 h-16 rounded-full object-cover border border-[var(--border-base)]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-dim)] border border-[var(--accent-border)] flex items-center justify-center text-xl font-bold text-[var(--accent)]">
                    {member?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {member?.displayName}
                  </h3>
                  <div className="text-[13px] text-[var(--text-secondary)]">
                    @{member?.username}
                  </div>
                  <div className="mt-1 font-mono text-[13px] text-[var(--text-secondary)]">
                    ID: {member?.id}
                  </div>
                </div>
              </div>

              <div className="space-y-3 py-4 border-b border-[var(--border-base)] text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Clearance Level</span>
                  <Badge variant="brand">{member?.roleTier || 'MEMBER'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Department</span>
                  <span className="font-medium text-[var(--text-primary)]">{member?.department || 'HQ Operations'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Joined Guild</span>
                  <span className="text-[var(--text-primary)]">
                    {member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Roles Section */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">Assigned Discord Roles</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {member?.roles?.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border-base)] text-[13px] text-[var(--text-secondary)]"
                    >
                      <span>@{r.name}</span>
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        Already assigned · {roleReason(r)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRoleAction(r.id, 'REMOVE')}
                        disabled={!r.manageable || isMutatingRole}
                        title={r.manageable ? 'Remove role' : `Cannot manage: ${roleReason(r)}`}
                        aria-label={`Remove ${r.name}: ${roleReason(r)}`}
                        className="text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Role Control */}
                <div className="pt-2 flex gap-2">
                  <Select aria-label="selected New Role"
                    value={selectedNewRole}
                    onChange={(e) => setSelectedNewRole(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Select role to assign...</option>
                    {(data?.allRoles || []).map((r) => {
                      const isAssigned = assignedRoleIds.has(r.id);
                      return (
                      <option key={r.id} value={r.id} disabled={isAssigned || !r.manageable}>
                        @{r.name} — {isAssigned ? 'Already assigned' : 'Not assigned'} · {roleReason(r)}
                      </option>
                    );})}
                  </Select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => selectedNewRole && handleRoleAction(selectedNewRole, 'ADD')}
                    disabled={!selectedNewRole || isMutatingRole || !data?.allRoles?.some((role) => role.id === selectedNewRole && role.manageable && !assignedRoleIds.has(role.id))}
                    isLoading={isMutatingRole}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Activity / Associated Entities (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Associated Tasks Card */}
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 ">
              <div className="pb-3 mb-3 border-b border-[var(--border-base)] flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                  <span>Assigned Operations Tasks</span>
                </h4>
              </div>

              {(!data?.tasks || data.tasks.length === 0) ? (
                <div className="text-[13px] text-[var(--text-secondary)] py-4 text-center">
                  No active tasks assigned to this operator.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] flex items-center justify-between text-[13px]"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">#{t.taskNumber} {t.title}</div>
                        <div className="text-[13px] text-[var(--text-secondary)]">{t.department} • Priority: {t.priority}</div>
                      </div>
                      <Badge variant={t.status === 'COMPLETED' ? 'success' : 'warning'}>
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Associated Tickets Card */}
            <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-5 ">
              <div className="pb-3 mb-3 border-b border-[var(--border-base)] flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-[var(--accent)]" />
                  <span>Associated Tickets</span>
                </h4>
              </div>

              {(!data?.tickets || data.tickets.length === 0) ? (
                <div className="text-[13px] text-[var(--text-secondary)] py-4 text-center">
                  No ticket records on file for this user.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.tickets.map((tk) => (
                    <div
                      key={tk.id}
                      className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] flex items-center justify-between text-[13px]"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">#{tk.ticketNumber} {tk.subject}</div>
                        <div className="text-[13px] text-[var(--text-secondary)]">{tk.category} • {new Date(tk.createdAt).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={tk.status === 'RESOLVED' ? 'success' : 'brand'}>
                        {tk.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
