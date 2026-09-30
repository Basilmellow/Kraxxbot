'use client';
import { Tabs } from '@/components/ui/Tabs';

import { PageContainer } from '@/components/ui/Page';
import { Select, FilterBar, SearchField } from '@/components/ui/Form';
import { Table } from '@/components/ui/Table';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Ticket as TicketIcon, Search, CheckCircle2, AlertTriangle, Eye, ExternalLink } from 'lucide-react';

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
  const confirm = useConfirm();
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
    if (action === 'DELETE' && !await confirm('Confirm permanent deletion of ticket record?')) return;
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
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Ticket action failed' });
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
        title="Tickets"
        subtitle="Review support requests and manage their resolution."
      />

      <PageContainer className="space-y-6">
        {/* Filter View Bar & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* View Tabs */}
          <Tabs label="Filter by status" items={VIEWS.map(item => ({ value: item.id, label: item.label }))} value={activeView} onChange={setActiveView} />

          {/* Search & Category Filter */}
          <FilterBar className="">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <SearchField label="Search ticket # or opener..."
                type="text"
                placeholder="Search ticket # or opener..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 pr-3 w-48 sm:w-60"
              />
            </div>

            <Select aria-label="category Filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className=""
            >
              <option value="">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="KRAXXSEC">KRAXXSEC</option>
              <option value="STUDIO">KRAXX Studio</option>
              <option value="SUPPORT">Technical Support</option>
            </Select>
          </FilterBar>
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

        {/* Ticket List Card */}
        <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl overflow-hidden p-0 ">
          <div className="p-5 border-b border-[var(--border-base)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-[var(--accent)]" />
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
            <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto table-scroll">
              <Table className="kraxx-table">
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
                      <td className="font-semibold text-[var(--accent)] font-mono">
                        #{t.ticketNumber}
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>
                        <span className="text-[13px] text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-base)]">
                          {t.category}
                        </span>
                      </td>
                      <td className="text-[var(--text-primary)] font-medium max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="text-[var(--text-secondary)]">
                        {t.openerName}
                      </td>
                      <td className="text-[var(--text-secondary)]">
                        {t.claimerName ? (
                          <span className="text-[var(--success)] font-medium">@{t.claimerName}</span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">Unassigned</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInspectTicket(t)}
                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {t.status === 'OPEN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTicketAction(t.id, 'CLAIM')}
                              className="text-[13px] py-1 px-3"
                            >
                              Claim
                            </Button>
                          )}

                          {t.status === 'CLAIMED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTicketAction(t.id, 'CLOSE')}
                              className="text-[13px] py-1 px-3 text-[var(--danger)] border-[var(--danger-border)] hover:bg-[var(--danger-bg)]"
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </PageContainer>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] text-[13px]">
              <div>
                <span className="text-[var(--text-secondary)] block text-[13px] uppercase font-semibold">Status</span>
                <div className="mt-1">{getStatusBadge(inspectTicket.status)}</div>
              </div>
              <div>
                <span className="text-[var(--text-secondary)] block text-[13px] uppercase font-semibold">Category</span>
                <span className="text-[var(--text-primary)] font-medium mt-1 block">{inspectTicket.category}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)] block text-[13px] uppercase font-semibold">Opener</span>
                <span className="text-[var(--text-primary)] font-medium mt-1 block">{inspectTicket.openerName}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)] block text-[13px] uppercase font-semibold">Claimed By</span>
                <span className="text-[var(--text-primary)] font-medium mt-1 block">
                  {inspectTicket.claimerName ? `@${inspectTicket.claimerName}` : 'None'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)] block text-[13px] uppercase font-semibold">Closed By</span>
                <span className="text-[var(--text-primary)] font-medium mt-1 block">
                  {inspectTicket.closedByName ? `@${inspectTicket.closedByName}` : 'N/A'}
                </span>
              </div>
            </div>

            {inspectTicket.reason && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)]">
                <span className="text-[13px] uppercase font-semibold text-[var(--text-secondary)] block mb-1">
                  Resolution Reason / Note
                </span>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{inspectTicket.reason}</p>
              </div>
            )}

            {inspectTicket.transcriptUrl && (
              <a
                href={inspectTicket.transcriptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[13px] text-[var(--accent)] hover:text-[var(--accent)] font-medium hover:underline"
              >
                <span>View Full Ticket Transcript</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-base)]">
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
