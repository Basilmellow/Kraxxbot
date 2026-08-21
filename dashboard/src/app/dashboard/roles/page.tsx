'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldAlert, Hash, Users, Shield, Layers } from 'lucide-react';

interface RoleItem {
  id: string;
  name: string;
  color: string | null;
  position: number;
  permissions: string;
  memberCount: number;
  isManaged: boolean;
}

export default function RolesHierarchyPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error('Failed to load roles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div>
      <Topbar
        title="Role Hierarchy"
        subtitle="Guild Security Structure, Precedence & Permission Levels"
        onRefresh={fetchRoles}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <ShieldAlert className="w-4 h-4 text-[#00f0ff]" />
              <span>Server Roles Hierarchy ({roles.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#64748b] font-mono">
              Position Order: Highest Precedence to Lowest
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Rank / Position</th>
                  <th>Role Name</th>
                  <th>Role ID</th>
                  <th>Member Count</th>
                  <th>Managed</th>
                  <th>Permissions Bitfield</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                      Loading roles hierarchy...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                      No roles returned from Discord API.
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs text-[#00f0ff] font-bold">
                        #{r.position}
                      </td>

                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: r.color || '#94a3b8' }}
                          />
                          <span
                            className="font-semibold text-xs"
                            style={{ color: r.color || '#e2e8f0' }}
                          >
                            {r.name}
                          </span>
                        </div>
                      </td>

                      <td className="font-mono text-xs text-[#94a3b8]">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-[#64748b]" />
                          <span>{r.id}</span>
                        </div>
                      </td>

                      <td className="font-mono text-xs text-[#e2e8f0]">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#64748b]" />
                          <span>{r.memberCount}</span>
                        </div>
                      </td>

                      <td>
                        {r.isManaged ? (
                          <Badge variant="brand">Integration Managed</Badge>
                        ) : (
                          <span className="text-[11px] text-[#64748b]">Standard</span>
                        )}
                      </td>

                      <td className="font-mono text-[11px] text-[#64748b]">
                        {r.permissions}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
