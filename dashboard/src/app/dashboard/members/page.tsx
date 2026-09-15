'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Users,
  Search,
  ShieldCheck,
  Calendar,
  ChevronRight,
  UserCheck,
  Hash,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

interface MemberItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  joinedAt: string;
  roles: { id: string; name: string; color: number }[];
  isVerified: boolean;
  department: string | null;
  roleTier: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedRole) params.set('role', selectedRole);

      const res = await fetch(`/api/members?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error('Failed to load members:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMembers();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedRole]);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'FOUNDER':
        return <Badge variant="brand">FOUNDER</Badge>;
      case 'COFOUNDER':
        return <Badge variant="studio">CO-FOUNDER</Badge>;
      case 'MANAGEMENT_HEAD':
        return <Badge variant="cyan">HQ MANAGEMENT</Badge>;
      case 'TEAM_LEAD':
        return <Badge variant="success">TEAM LEAD</Badge>;
      case 'DIVISION_MEMBER':
        return <Badge variant="neutral">OPERATOR</Badge>;
      default:
        return <Badge variant="neutral">MEMBER</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Operator & Guild Directory"
        subtitle="Active Guild Personnel, Role Clearances & Personnel Dossiers"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input
              type="text"
              placeholder="Search by username, display name, or Discord ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            >
              <option value="">All Guild Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  @{r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Member Table Card */}
        <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F3F9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Guild Directory Personnel ({members.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No members found"
                description="No guild members matching your search query."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Member Profile</th>
                    <th>Clearance Tier</th>
                    <th>Division</th>
                    <th>Roles</th>
                    <th>Joined Discord</th>
                    <th className="text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img
                              src={m.avatar}
                              alt={m.displayName}
                              className="w-8 h-8 rounded-full object-cover border border-[#E5E7EB]"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                              {m.displayName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-xs text-[#101828]">
                              {m.displayName}
                            </div>
                            <div className="text-[11px] text-[#667085]">
                              @{m.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{getTierBadge(m.roleTier)}</td>
                      <td>
                        <span className="text-[11px] font-semibold text-[#475467] bg-[#F3F5FA] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                          {m.department || 'HQ'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {m.roles.slice(0, 3).map((r) => (
                            <span
                              key={r.id}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E5E7EB] text-[#475467]"
                            >
                              @{r.name}
                            </span>
                          ))}
                          {m.roles.length > 3 && (
                            <span className="text-[10px] text-[#98A2B3] px-1 py-0.5">
                              +{m.roles.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-xs text-[#667085]">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <Link href={`/dashboard/members/${m.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2.5"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </Link>
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
