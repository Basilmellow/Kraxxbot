'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Bot, CheckCircle2, ChevronRight, RefreshCw, Search, ShieldCheck, UserRound, Users } from 'lucide-react';

interface MemberItem {
  id: string;
  username: string;
  displayName: string;
  isBot: boolean;
  avatar: string | null;
  joinedAt: string | null;
  roles: { id: string; name: string; color: number }[];
  roleIds: string[];
  isVerified: boolean;
  roleTier: string;
}

export default function MembersPage() {
  const router = useRouter();
  const guildId = useGuildId();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCapped, setIsCapped] = useState(false);

  const requestMembers = useCallback(async () => {
      const params = new URLSearchParams({ guildId, limit: '1000' });
      const res = await fetch(`/api/members?${params.toString()}`, { signal: AbortSignal.timeout(30000) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load this guild’s members.');
      return {
        members: (data.members || []) as MemberItem[],
        roles: (data.roles || []) as { id: string; name: string }[],
        capped: Boolean(data.capped),
      };
  }, [guildId]);

  const fetchMembers = useCallback(() => {
    setIsRefreshing(true);
    setLoadError(null);
    void requestMembers()
      .then((result) => {
        setMembers(result.members);
        setRoles(result.roles);
        setIsCapped(result.capped);
      })
      .catch((error: unknown) => {
        console.error('Failed to load members:', error);
        setLoadError(error instanceof Error ? error.message : 'Could not reach the member service. Try again.');
      })
      .finally(() => { setIsLoading(false); setIsRefreshing(false); });
  }, [requestMembers]);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
    let active = true;
    void requestMembers()
      .then((result) => {
        if (!active) return;
        setMembers(result.members);
        setRoles(result.roles);
        setIsCapped(result.capped);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load members:', error);
        setLoadError(error instanceof Error ? error.message : 'Could not reach the member service. Try again.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [guildId, requestMembers, router]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members.filter((member) => {
      const matchesQuery = !query ||
        member.username.toLowerCase().includes(query) ||
        member.displayName.toLowerCase().includes(query) ||
        member.id.includes(query);
      const matchesRole = !selectedRole || member.roleIds.includes(selectedRole);
      return matchesQuery && matchesRole;
    });
  }, [members, searchQuery, selectedRole]);

  const verifiedCount = members.filter((member) => member.isVerified).length;
  const botCount = members.filter((member) => member.isBot).length;
  const humanCount = members.length - botCount;
  const summary = [
    { label: 'Members loaded from Discord', value: isCapped ? '1,000+' : members.length, icon: Users },
    { label: 'Humans', value: humanCount, icon: UserRound },
    { label: 'Bots', value: botCount, icon: Bot },
    { label: 'Verified in KRAXXBot', value: verifiedCount, icon: ShieldCheck },
  ];

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'FOUNDER': return <Badge variant="brand">FOUNDER</Badge>;
      case 'COFOUNDER': return <Badge variant="studio">CO-FOUNDER</Badge>;
      case 'MANAGEMENT_HEAD': return <Badge variant="cyan">HQ MANAGEMENT</Badge>;
      case 'TEAM_LEAD': return <Badge variant="success">TEAM LEAD</Badge>;
      case 'DIVISION_MEMBER': return <Badge variant="neutral">OPERATOR</Badge>;
      default: return <Badge variant="neutral">MEMBER</Badge>;
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Topbar
        title="Operator & Guild Directory"
        subtitle="Manage member roles and personnel information for this server"
      />

      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
          {summary.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="flex min-w-0 items-center gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-[var(--text-secondary)]">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
              </div>
            </Card>
          ))}
        </section>

        <Card className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search members</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                placeholder="Search name, username, or Discord ID"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border-base)] bg-[var(--surface-1)] pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dim)]"
              />
            </label>
            <label className="sm:w-64">
              <span className="sr-only">Filter by Discord role</span>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border-base)] bg-[var(--surface-1)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dim)]"
              >
                <option value="">All guild roles</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
            <Button variant="outline" onClick={fetchMembers} disabled={isRefreshing} className="h-11 justify-center px-4">
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <span>{filteredMembers.length} {searchQuery || selectedRole ? 'matching members' : 'members shown'}</span>
            {isCapped && <span>Showing the first 1,000 Discord members. Narrow the search to find a member.</span>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4"><SkeletonTable rows={8} /></div>
          ) : loadError ? (
            <div className="p-6 sm:p-8">
              <ErrorState title="Members unavailable" message={loadError} onRetry={fetchMembers} />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={Users}
                title="No members found"
                description={searchQuery || selectedRole
                  ? 'No Discord members match the current search and role filters.'
                  : 'Discord returned no members for this server. Refresh to try again.'}
                actionLabel={!searchQuery && !selectedRole ? 'Refresh members' : undefined}
                onAction={!searchQuery && !selectedRole ? fetchMembers : undefined}
              />
            </div>
          ) : (
            <>
            <div className="grid gap-3 p-3 md:hidden">
              {filteredMembers.map((member) => (
                <article key={member.id} className="rounded-xl border border-[var(--border-base)] bg-[var(--surface-1)] p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full border border-[var(--border-base)] object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-base)] bg-[var(--surface-2)] font-semibold text-[var(--accent)]">
                        {member.displayName.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="max-w-full truncate text-sm font-semibold text-[var(--text-primary)]">{member.displayName}</h2>
                        {member.isBot && <Badge variant="cyan">BOT</Badge>}
                        {member.isVerified && <Badge variant="success">Verified</Badge>}
                      </div>
                      <p className="truncate text-xs text-[var(--text-secondary)]">@{member.username}</p>
                      <p className="mt-1 break-all font-mono text-[10px] text-[var(--text-muted)]">{member.id}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.roles.length ? member.roles.slice(0, 5).map((role) => <Badge key={role.id} variant="neutral">{role.name}</Badge>) : <span className="text-xs text-[var(--text-muted)]">No roles</span>}
                    {member.roles.length > 5 && <span className="text-xs text-[var(--text-muted)]">+{member.roles.length - 5}</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border-base)] pt-3">
                    <span className="text-xs text-[var(--text-secondary)]">Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'date unavailable'}</span>
                    <Link href={`/dashboard/${guildId}/members/${member.id}`}>
                      <Button variant="outline" size="sm">Profile <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="kraxx-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Discord ID</th>
                    <th>Clearance</th>
                    <th>Discord roles</th>
                    <th>Verification</th>
                    <th>Joined</th>
                    <th className="text-right">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3 py-1">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="h-9 w-9 rounded-full border border-[var(--border-base)] object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-base)] bg-[var(--surface-2)] text-sm font-semibold text-[var(--accent)]">
                              {member.displayName.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-[var(--text-primary)]">{member.displayName}</div>
                            <div className="truncate text-xs text-[var(--text-secondary)]">@{member.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[var(--text-secondary)]">{member.id}</td>
                      <td>{getTierBadge(member.roleTier)}</td>
                      <td>
                        <div className="flex max-w-sm flex-wrap gap-1.5">
                          {member.roles.slice(0, 4).map((role) => (
                            <Badge key={role.id} variant="neutral">{role.name}</Badge>
                          ))}
                          {member.roles.length > 4 && <span className="text-xs text-[var(--text-muted)]">+{member.roles.length - 4}</span>}
                          {member.roles.length === 0 && <span className="text-xs text-[var(--text-muted)]">No roles</span>}
                        </div>
                      </td>
                      <td>
                        {member.isVerified
                          ? <Badge variant="success"><CheckCircle2 className="mr-1 h-3 w-3" />Verified</Badge>
                          : <Badge variant="neutral">Not verified</Badge>}
                      </td>
                      <td className="text-xs text-[var(--text-secondary)]">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unavailable'}
                      </td>
                      <td className="text-right">
                        <Link href={`/dashboard/${guildId}/members/${member.id}`}>
                          <Button variant="outline" size="sm" className="px-3">
                            Profile <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
        <p className="text-xs text-[var(--text-muted)]">Discord presence status is not available in this dashboard. Member details and join dates are shown only when Discord provides them.</p>
      </div>
    </div>
  );
}
