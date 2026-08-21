'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Ticket as TicketIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  XCircle,
  RotateCcw,
  Eye,
  Trash2,
  Hash,
  Clock,
  ExternalLink,
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
    if (action === 'DELETE' && !confirm('Are you sure you want to permanently delete this ticket record?')) return;
    if (action === 'CLOSE') {
      const reason = prompt('Optional closing note / resolution reason:');
      executeAction(ticketId, action, reason || undefined);
      return;
    }
    executeAction(ticketId, action);
  };

  const executeAction = async (ticketId: string, action: string, reason?: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Ticket action "${action}" completed successfully.` });
        if (inspectTicket && inspectTicket.id === ticketId) {
          setInspectTicket(null);
        }
        fetchTickets();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to perform ticket action' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Error updating ticket' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">Open</Badge>;
      case 'CLAIMED':
        return <Badge variant="brand">Claimed</Badge>;
      case 'CLOSED':
        return <Badge variant="neutral">Closed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div>
      <Topbar
        title="Support Ticket Desk"
        subtitle="KRAXX HQ Client & Division Inquiry Operations"
        onRefresh={fetchTickets}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveView(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  activeView === v.id
                    ? 'bg-[#00f0ff] text-[#0a0e15] border-[#00f0ff]'
                    : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search tickets by # or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
            />
          </div>
        </div>

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

        {/* Tickets Table */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <TicketIcon className="w-4 h-4 text-[#00f0ff]" />
              <span>Operations Tickets ({tickets.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#64748b] font-mono">
              Category: {activeView}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Opener</th>
                  <th>Assigned Staff</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-xs text-[#64748b]">
                      Loading tickets...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-xs text-[#64748b]">
                      No tickets found in this view.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs font-bold text-[#00f0ff]">
                        #{t.ticketNumber}
                      </td>

                      <td className="font-semibold text-xs text-[#e2e8f0] max-w-xs truncate">
                        {t.subject}
                      </td>

                      <td>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0f1318] border border-[#1e2a38] text-[#94a3b8]">
                          {t.category}
                        </span>
                      </td>

                      <td className="text-xs text-[#e2e8f0] font-medium">
                        {t.openerName}
                      </td>

                      <td className="text-xs text-[#94a3b8] font-mono">
                        {t.claimerName ? (
                          <span className="text-[#10b981] flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span>{t.claimerName}</span>
                          </span>
                        ) : (
                          <span className="text-[#64748b] italic">Unassigned</span>
                        )}
                      </td>

                      <td>{getStatusBadge(t.status)}</td>

                      <td className="whitespace-nowrap font-mono text-xs text-[#64748b]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>

                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectTicket(t)}
                            className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#00f0ff]"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {t.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => handleTicketAction(t.id, 'CLAIM')}
                              className="px-2 py-1 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] text-xs font-semibold"
                            >
                              Claim
                            </button>
                          )}

                          {t.status === 'CLAIMED' && (
                            <button
                              type="button"
                              onClick={() => handleTicketAction(t.id, 'CLOSE')}
                              className="px-2 py-1 rounded bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs font-semibold"
                            >
                              Close
                            </button>
                          )}

                          {t.status === 'CLOSED' && (
                            <button
                              type="button"
                              onClick={() => handleTicketAction(t.id, 'REOPEN')}
                              className="p-1.5 rounded hover:bg-[#141a22] text-[#94a3b8] hover:text-[#00f0ff]"
                              title="Reopen Ticket"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Ticket Details Modal */}
      {inspectTicket && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-[#00f0ff]" />
                  <span>Ticket #{inspectTicket.ticketNumber} Details</span>
                </h3>
                <span className="text-[11px] font-mono text-[#64748b]">Channel ID: {inspectTicket.channelId}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectTicket(null)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#64748b]">Subject:</span>
                <p className="font-semibold text-[#e2e8f0] text-sm mt-0.5">{inspectTicket.subject}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#0a0e15] border border-[#1e2a38]">
                <div>
                  <span className="text-[#64748b]">Category:</span>
                  <p className="font-mono text-[#e2e8f0]">{inspectTicket.category}</p>
                </div>
                <div>
                  <span className="text-[#64748b]">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(inspectTicket.status)}</div>
                </div>
                <div>
                  <span className="text-[#64748b]">Opener:</span>
                  <p className="text-[#e2e8f0] font-medium">{inspectTicket.openerName}</p>
                </div>
                <div>
                  <span className="text-[#64748b]">Assigned Staff:</span>
                  <p className="text-[#e2e8f0] font-medium">{inspectTicket.claimerName || 'None'}</p>
                </div>
              </div>

              {inspectTicket.reason && (
                <div className="p-3 rounded-lg bg-[#0a0e15] border border-[#1e2a38]">
                  <span className="text-[#64748b]">Closing Resolution Note:</span>
                  <p className="text-[#e2e8f0] mt-1">{inspectTicket.reason}</p>
                </div>
              )}

              {inspectTicket.transcriptUrl && (
                <div className="p-3 rounded-lg bg-[#0a0e15] border border-[#1e2a38] flex items-center justify-between">
                  <span className="text-[#64748b]">Archived Transcript:</span>
                  <a
                    href={inspectTicket.transcriptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00f0ff] font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>View Transcript</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#1e2a38] flex items-center justify-between">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleTicketAction(inspectTicket.id, 'DELETE')}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Delete</span>
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
                    variant="danger"
                    size="sm"
                    onClick={() => handleTicketAction(inspectTicket.id, 'CLOSE')}
                  >
                    Close Ticket
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInspectTicket(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
