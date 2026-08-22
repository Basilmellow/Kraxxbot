'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
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
  { id: 'ALL', label: 'ALL TICKETS' },
  { id: 'OPEN', label: 'OPEN' },
  { id: 'CLAIMED', label: 'CLAIMED' },
  { id: 'CLOSED', label: 'CLOSED' },
  { id: 'MY_TICKETS', label: 'MY TICKETS' },
  { id: 'UNASSIGNED', label: 'UNASSIGNED' },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeView, setActiveView] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [inspectTicket, setInspectTicket] = useState<TicketItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
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
    const handler = setTimeout(() => {
      fetchTickets();
    }, 250);
    return () => clearTimeout(handler);
  }, [activeView, categoryFilter, searchQuery]);

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
      const res = await fetch(`/api/tickets/${ticketId}/action`, {
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
        title="SUPPORT DISPATCH & TICKET OPS"
        subtitle="Operations Desk, Live Discord Channel Inquiries & Resolution Telemetry"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Filter View Bar & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
          {/* View Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded bg-[#0A0F16] border border-[#16202E]">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveView(v.id)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === v.id
                    ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3 h-3 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket # / opener..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
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

        {/* Ticket List Card */}
        <Card className="bg-[#0A0F16] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketIcon className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>DISPATCH TELEMETRY DESK ({tickets.length})</span>
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={TicketIcon}
                title="NO TICKETS MATCHING PARAMETERS"
                description="No active Discord tickets found in the queue matching current view parameters."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                    <th className="py-2.5 px-4 font-semibold">TICKET ID</th>
                    <th className="py-2.5 px-4 font-semibold">STATUS</th>
                    <th className="py-2.5 px-4 font-semibold">CATEGORY</th>
                    <th className="py-2.5 px-4 font-semibold">SUBJECT / ISSUE</th>
                    <th className="py-2.5 px-4 font-semibold">OPENER</th>
                    <th className="py-2.5 px-4 font-semibold">ASSIGNED TO</th>
                    <th className="py-2.5 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16202E]">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-[#0D131C] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#22D3EE]">
                        #{t.ticketNumber}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] text-[#64748B] bg-[#070B10] px-2 py-0.5 rounded border border-[#16202E]">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#F1F5F9] font-medium max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        {t.openerName}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        {t.claimerName ? (
                          <span className="text-[#10B981]">@{t.claimerName}</span>
                        ) : (
                          <span className="text-[#64748B]">UNASSIGNED</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectTicket(t)}
                            className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#94A3B8] hover:text-[#22D3EE] hover:border-[#22D3EE]/30 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {t.status === 'OPEN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTicketAction(t.id, 'CLAIM')}
                              className="font-mono text-[10px] py-0.5 px-2"
                            >
                              CLAIM
                            </Button>
                          )}

                          {t.status === 'CLAIMED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTicketAction(t.id, 'CLOSE')}
                              className="font-mono text-[10px] py-0.5 px-2 text-[#EF4444] border-red-900/30"
                            >
                              CLOSE
                            </Button>
                          )}

                          {t.status === 'CLOSED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTicketAction(t.id, 'REOPEN')}
                              className="font-mono text-[10px] py-0.5 px-2 text-[#22D3EE]"
                            >
                              REOPEN
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

        {/* Ticket Inspector Modal */}
        {inspectTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)] max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider">
                    TICKET #{inspectTicket.ticketNumber} // {inspectTicket.subject}
                  </h3>
                  {getStatusBadge(inspectTicket.status)}
                </div>
                <button
                  type="button"
                  onClick={() => setInspectTicket(null)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded bg-[#070B10] border border-[#16202E]">
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">CATEGORY</span>
                    <span className="text-[#F1F5F9]">{inspectTicket.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">OPENER</span>
                    <span className="text-[#F1F5F9]">{inspectTicket.openerName} ({inspectTicket.openerId})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">ASSIGNED</span>
                    <span className="text-[#F1F5F9]">{inspectTicket.claimerName || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">CREATED</span>
                    <span className="text-[#F1F5F9]">{new Date(inspectTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {inspectTicket.reason && (
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block mb-1">CLOSURE RESOLUTION NOTE</span>
                    <div className="p-3 rounded bg-[#070B10] border border-[#16202E] text-[#F1F5F9]">
                      {inspectTicket.reason}
                    </div>
                  </div>
                )}

                {inspectTicket.transcriptUrl && (
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block mb-1">AUDIT TRANSCRIPT</span>
                    <a
                      href={inspectTicket.transcriptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#22D3EE] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>VIEW ARCHIVED HTML TRANSCRIPT</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-6 pt-3 border-t border-[#16202E]">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleTicketAction(inspectTicket.id, 'DELETE')}
                  className="font-mono text-xs"
                >
                  DELETE RECORD
                </Button>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setInspectTicket(null)}>
                    CLOSE
                  </Button>

                  {inspectTicket.status === 'OPEN' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTicketAction(inspectTicket.id, 'CLAIM')}
                    >
                      CLAIM TICKET
                    </Button>
                  )}

                  {inspectTicket.status === 'CLAIMED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTicketAction(inspectTicket.id, 'CLOSE')}
                      className="text-[#EF4444]"
                    >
                      RESOLVE & CLOSE
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
