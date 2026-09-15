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
        <Topbar title="Personnel Dossier" subtitle="Retrieving telemetry..." />
        <div className="p-12 text-center text-xs text-[#667085]">
          Loading operator dossier profile...
        </div>
      </div>
    );
  }

  const member = data?.member;
  const availableRoles = (data?.allGuildRoles || []).filter(
    (gr: any) => !member?.roles?.some((mr: any) => mr.id === gr.id)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title={`Personnel Dossier: ${member?.displayName || userId}`}
        subtitle="Operational Profile, Discord Hierarchy & System Activity"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard/members"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Personnel Directory</span>
          </Link>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profile Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-4 pb-5 border-b border-[#F1F3F9]">
                {member?.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.displayName}
                    className="w-16 h-16 rounded-full object-cover border border-[#E5E7EB]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                    {member?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-[#101828]">
                    {member?.displayName}
                  </h3>
                  <div className="text-xs text-[#667085]">
                    @{member?.username}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#98A2B3]">
                    ID: {member?.id}
                  </div>
                </div>
              </div>

              <div className="space-y-3 py-4 border-b border-[#F1F3F9] text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Clearance Level</span>
                  <Badge variant="brand">{member?.roleTier || 'MEMBER'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Department</span>
                  <span className="font-medium text-[#101828]">{member?.department || 'HQ Operations'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Joined Guild</span>
                  <span className="text-[#101828]">
                    {member?.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Roles Section */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#101828]">Assigned Discord Roles</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {member?.roles?.map((r: any) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#475467]"
                    >
                      <span>@{r.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRoleAction(r.id, 'REMOVE')}
                        className="text-[#98A2B3] hover:text-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Role Control */}
                <div className="pt-2 flex gap-2">
                  <select
                    value={selectedNewRole}
                    onChange={(e) => setSelectedNewRole(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select role to assign...</option>
                    {availableRoles.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => selectedNewRole && handleRoleAction(selectedNewRole, 'ADD')}
                    disabled={!selectedNewRole || isMutatingRole}
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
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
              <div className="pb-3 mb-3 border-b border-[#F1F3F9] flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>Assigned Operations Tasks</span>
                </h4>
              </div>

              {(!data?.tasks || data.tasks.length === 0) ? (
                <div className="text-xs text-[#667085] py-4 text-center">
                  No active tasks assigned to this operator.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.tasks.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#101828]">#{t.taskNumber} {t.title}</div>
                        <div className="text-[11px] text-[#667085]">{t.department} • Priority: {t.priority}</div>
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
            <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
              <div className="pb-3 mb-3 border-b border-[#F1F3F9] flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-indigo-600" />
                  <span>Associated Tickets</span>
                </h4>
              </div>

              {(!data?.tickets || data.tickets.length === 0) ? (
                <div className="text-xs text-[#667085] py-4 text-center">
                  No ticket records on file for this user.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.tickets.map((tk: any) => (
                    <div
                      key={tk.id}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#101828]">#{tk.ticketNumber} {tk.subject}</div>
                        <div className="text-[11px] text-[#667085]">{tk.category} • {new Date(tk.createdAt).toLocaleDateString()}</div>
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
      </div>
    </div>
  );
}
