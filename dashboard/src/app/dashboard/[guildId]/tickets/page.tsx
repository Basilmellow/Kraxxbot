'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import {
  Ticket as TicketIcon,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  XCircle,
  RotateCcw,
  Eye,
  Trash2,
  ExternalLink,
  X,
  Lock,
} from 'lucide-react';

interface TicketItem {
  id: string;
  ticketNumber: number;
  guildId: string;
  channelId: string;
  openerId: string;
  openerName: string;
  claimerId: string | null;
  claimerName: string | null;
  closedById: string | null;
  closedByName: string | null;
  transcriptUrl: string | null;
  category: string;
  subject: string;
  reason: string | null;
  status: 'OPEN' | 'CLAIMED' | 'CLOSED';
  closedAt: string | null;
  createdAt: string;
}

const VIEWS = [
  { id: 'ALL', label: 'All Tickets' },
  { id: 'OPEN', label: 'Open' },
  { id: 'CLAIMED', label: 'Claimed' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'MY_TICKETS', label: 'My Tickets' },
  { id: 'UNASSIGNED', label: 'Unassigned' },
];

export default function TicketsPage() {
  const router = useRouter();
  const guildId = useGuildId();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeView, setActiveView] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [inspectTicket, setInspectTicket] = useState<TicketItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTickets = async () => {
    if (!guildId) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('guildId', guildId);
      params.set('status', activeView);
      if (categoryFilter) params.set('category', categoryFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (e) {
      console.error('Failed to load tickets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
    const handler = setTimeout(() => {
      fetchTickets();
    }, 250);
    return () => clearTimeout(handler);
  }, [activeView, categoryFilter, searchQuery, guildId]);

  const handleTicketAction = async (ticketId: string, action: 'CLAIM' | 'UNCLAIM' | 'CLOSE' | 'REOPEN' | 'DELETE') => {
    if (action === 'DELETE' && !confirm('Confirm permanent deletion of ticket record?')) return;
    if (action === 'CLOSE') {
      const reason = prompt('Resolution reason / closure note:');
      executeAction(ticketId, action, reason || undefined);
      return;
    }
    executeAction(ticketId, action);
  };

  const executeAction = async (ticketId: string, action: string, reason?: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/action?guildId=${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setFeedback({ type: 'success', message: `Ticket action executed: ${action}` });
      if (inspectTicket && inspectTicket.id === ticketId) {
        if (action === 'DELETE') setInspectTicket(null);
        else setInspectTicket(data.ticket);
      }
      fetchTickets();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Ticket action failed' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">OPEN</Badge>;
      case 'CLAIMED':
        return <Badge variant="brand">CLAIMED</Badge>;
      case 'CLOSED':
        return <Badge variant="neutral">CLOSED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Support & Ticket Operations"
        subtitle="Operations Desk, Live Discord Inquiries & Resolution Management"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Filter View Bar & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* View Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveView(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === v.id
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket # or opener..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 pr-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs w-48 sm:w-60"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            >
              <option value="">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="KRAXXSEC">KRAXXSEC</option>
              <option value="STUDIO">KRAXX Studio</option>
              <option value="SUPPORT">Technical Support</option>
            </select>
          </div>
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

        {/* Ticket List Card */}
        <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F3F9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-indigo-600" />
              <span>Support Inquiries ({tickets.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={TicketIcon}
                title="No tickets matching parameters"
                description="No active Discord tickets found in the queue matching current view parameters."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Subject / Issue</th>
                    <th>Opener</th>
                    <th>Assigned To</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td className="font-semibold text-indigo-600 font-mono">
                        #{t.ticketNumber}
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>
                        <span className="text-[11px] text-[#475467] bg-[#F3F5FA] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                          {t.category}
                        </span>
                      </td>
                      <td className="text-[#101828] font-medium max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="text-[#475467]">
                        {t.openerName}
                      </td>
                      <td className="text-[#475467]">
                        {t.claimerName ? (
                          <span className="text-emerald-600 font-medium">@{t.claimerName}</span>
                        ) : (
                          <span className="text-[#98A2B3]">Unassigned</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectTicket(t)}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {t.status === 'OPEN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTicketAction(t.id, 'CLAIM')}
                              className="text-xs py-1 px-2.5"
                            >
                              Claim
                            </Button>
                          )}

                          {t.status === 'CLAIMED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTicketAction(t.id, 'CLOSE')}
                              className="text-xs py-1 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Ticket Details Modal */}
      {inspectTicket && (
        <Modal
          isOpen={true}
          onClose={() => setInspectTicket(null)}
          title={`Ticket #${inspectTicket.ticketNumber} — ${inspectTicket.subject}`}
          subtitle={`Created on ${new Date(inspectTicket.createdAt).toLocaleString()}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs">
              <div>
                <span className="text-[#667085] block text-[10px] uppercase font-semibold">Status</span>
                <div className="mt-1">{getStatusBadge(inspectTicket.status)}</div>
              </div>
              <div>
                <span className="text-[#667085] block text-[10px] uppercase font-semibold">Category</span>
                <span className="text-[#101828] font-medium mt-1 block">{inspectTicket.category}</span>
              </div>
              <div>
                <span className="text-[#667085] block text-[10px] uppercase font-semibold">Opener</span>
                <span className="text-[#101828] font-medium mt-1 block">{inspectTicket.openerName}</span>
              </div>
              <div>
                <span className="text-[#667085] block text-[10px] uppercase font-semibold">Claimed By</span>
                <span className="text-[#101828] font-medium mt-1 block">
                  {inspectTicket.claimerName ? `@${inspectTicket.claimerName}` : 'None'}
                </span>
              </div>
              <div>
                <span className="text-[#667085] block text-[10px] uppercase font-semibold">Closed By</span>
                <span className="text-[#101828] font-medium mt-1 block">
                  {inspectTicket.closedByName ? `@${inspectTicket.closedByName}` : 'N/A'}
                </span>
              </div>
            </div>

            {inspectTicket.reason && (
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <span className="text-[10px] uppercase font-semibold text-[#667085] block mb-1">
                  Resolution Reason / Note
                </span>
                <p className="text-xs text-[#101828] leading-relaxed">{inspectTicket.reason}</p>
              </div>
            )}

            {inspectTicket.transcriptUrl && (
              <a
                href={inspectTicket.transcriptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
              >
                <span>View Full Ticket Transcript</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#F1F3F9]">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleTicketAction(inspectTicket.id, 'DELETE')}
              >
                Delete Record
              </Button>

              <div className="flex items-center gap-2">
                {inspectTicket.status === 'OPEN' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleTicketAction(inspectTicket.id, 'CLAIM')}
                  >
                    Claim Ticket
                  </Button>
                )}
                {inspectTicket.status === 'CLAIMED' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTicketAction(inspectTicket.id, 'UNCLAIM')}
                  >
                    Unclaim
                  </Button>
                )}
                {inspectTicket.status === 'CLAIMED' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleTicketAction(inspectTicket.id, 'CLOSE')}
                  >
                    Close Ticket
                  </Button>
                )}
                {inspectTicket.status === 'CLOSED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleTicketAction(inspectTicket.id, 'REOPEN')}
                  >
                    Reopen Ticket
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
