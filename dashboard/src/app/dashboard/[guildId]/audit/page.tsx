'use client';

import { PageContainer } from '@/components/ui/Page';
import { Select, SearchField } from '@/components/ui/Form';
import { Table } from '@/components/ui/Table';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Pagination } from '@/components/ui/Pagination';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScrollText, Search } from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  executorId: string;
  targetId: string | null;
  details: string | null;
  timestamp: string;
}

export default function AuditLogPage() {
  const router = useRouter();
  const guildId = useGuildId();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  const fetchLogs = async (page = 1, action = '') => {
    if (!guildId) return;
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        guildId,
      });
      if (action) params.append('action', action);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchLogs(pagination.page, actionFilter));
  }, [pagination.page, actionFilter, guildId]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('ASSIGN') || action.includes('SUCCESS') || action.includes('VERIFIED')) return 'success';
    if (action.includes('REMOVE') || action.includes('DELETE') || action.includes('KICK') || action.includes('BAN')) return 'danger';
    if (action.includes('CONFIG') || action.includes('UPDATE')) return 'warning';
    return 'brand';
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.executorId?.toLowerCase().includes(q) ||
      (typeof log.details === 'string' && log.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Audit logs"
        subtitle="Review server actions, results, and who performed them."
      />

      <PageContainer className="space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <SearchField label="Search executor ID, action, or details..."
              type="text"
              placeholder="Search executor ID, action, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select aria-label="action Filter"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className=""
            >
              <option value="">All Audit Actions</option>
              <option value="ROLE_ASSIGN">ROLE_ASSIGN</option>
              <option value="ROLE_REMOVE">ROLE_REMOVE</option>
              <option value="TICKET_CREATE">TICKET_CREATE</option>
              <option value="TICKET_RESOLVE">TICKET_RESOLVE</option>
              <option value="MOD_BAN">MOD_BAN</option>
              <option value="MOD_KICK">MOD_KICK</option>
              <option value="MOD_TIMEOUT">MOD_TIMEOUT</option>
              <option value="ANNOUNCEMENT_SEND">ANNOUNCEMENT_SEND</option>
            </Select>
          </div>
        </div>

        {/* Audit Table Card */}
        <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl overflow-hidden p-0 ">
          <div className="p-5 border-b border-[var(--border-base)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[var(--accent)]" />
              <span>Immutable Ledger ({pagination.total} events)</span>
            </h3>
            <span className="text-[13px] text-[var(--text-secondary)]">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={10} />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ScrollText}
                title="No audit events found"
                description="No matching audit events recorded in this criteria."
              />
            </div>
          ) : (
            <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto table-scroll">
              <Table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Executor</th>
                    <th>Target / Details</th>
                    <th className="text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="text-[13px] text-[var(--text-secondary)]">
                        {log.executorId ? `@${log.executorId}` : 'SYSTEM BOT'}
                      </td>
                      <td className="max-w-md truncate text-[13px] text-[var(--text-primary)]">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || 'N/A'}
                      </td>
                      <td className="text-right text-[13px] text-[var(--text-secondary)]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <Pagination page={pagination.page} pageCount={Math.max(1, pagination.totalPages)} disabled={isLoading} onChange={page => setPagination(p => ({ ...p, page }))} />
        </Card>
      </PageContainer>
    </div>
  );
}
