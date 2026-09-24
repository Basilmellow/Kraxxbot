'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, Shield, RefreshCw } from 'lucide-react';

interface RoleItem {
  id: string;
  name: string;
  color: string | null;
  position: number;
  permissions: string;
  memberCount: number | null;
  isManaged: boolean;
}

export default function RolesHierarchyPage() {
  const router = useRouter();
  const guildId = useGuildId();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const requestRoles = useCallback(async (): Promise<RoleItem[]> => {
    const res = await fetch(`/api/roles?guildId=${guildId}`, { signal: AbortSignal.timeout(20000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Unable to load roles for this server.');
    return data.roles || [];
  }, [guildId]);

  const fetchRoles = useCallback(() => {
    setIsLoading(true);
    void requestRoles()
      .then((nextRoles) => { setRoles(nextRoles); setLoadError(null); })
      .catch((error: unknown) => {
        console.error('Failed to load roles:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load roles for this server.');
      })
      .finally(() => setIsLoading(false));
  }, [requestRoles]);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
    let active = true;
    void requestRoles()
      .then((nextRoles) => { if (active) { setRoles(nextRoles); setLoadError(null); } })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load roles for this server.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [guildId, requestRoles, router]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Role Hierarchy & Discord Permissions"
        subtitle="Guild Security Structure, Precedence Ranks & Bitfield Permissions"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F3F9] flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Server Role Hierarchy ({roles.length})</span>
            </h3>
            <span className="text-xs text-[#667085]">
              Precedence: Highest to Lowest
            </span>
            <Button variant="outline" size="sm" onClick={fetchRoles} disabled={isLoading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : loadError ? (
            <div className="p-6">
              <ErrorState title="Could not load roles" message={loadError} onRetry={fetchRoles} />
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Shield}
                title="No roles returned"
                description="Discord returned no roles for this server. Try refreshing, or check the bot’s server access."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {!roles.every((role) => role.memberCount !== null) && (
                <p className="px-5 py-3 text-xs text-[#A8A49B] border-b border-[#2A2925]">
                  Role hierarchy loaded. Member counts are unavailable because Discord did not provide member-list access.
                </p>
              )}
              <table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Precedence</th>
                    <th>Role Identity</th>
                    <th>Discord Role ID</th>
                    <th>Members</th>
                    <th>Integration</th>
                    <th className="text-right">Bitfield</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id}>
                      <td className="font-bold text-indigo-600 font-mono text-xs">
                        #{r.position}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: r.color || '#98A2B3' }}
                          />
                          <span className="font-semibold text-xs text-[#101828]">
                            @{r.name}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[#667085]">
                        {r.id}
                      </td>
                      <td className="text-xs text-[#475467]">
                        <span className="font-semibold text-[#101828]">{r.memberCount ?? '—'}</span>{r.memberCount === null ? ' members' : ' operators'}
                      </td>
                      <td>
                        {r.isManaged ? (
                          <Badge variant="cyan">MANAGED BOT ROLE</Badge>
                        ) : (
                          <Badge variant="neutral">STANDARD ROLE</Badge>
                        )}
                      </td>
                      <td className="text-right font-mono text-[11px] text-[#667085]">
                        {r.permissions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
