'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Server, Shield, Users, ShieldAlert, Ticket, DoorOpen, Megaphone, Sparkles, CheckSquare, AlarmClock, Zap, BarChart3, ScrollText, Settings, Boxes, Terminal, LogOut, Menu, MessagesSquare, CalendarDays } from 'lucide-react';
import { DASHBOARD_MODULES, CATEGORY_LABELS } from '@/lib/constants';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Server, Shield, Users, ShieldAlert, Ticket, DoorOpen,
  Megaphone, Sparkles, CheckSquare, AlarmClock, Zap, BarChart3, ScrollText,
  Settings, Boxes, Terminal, MessagesSquare, CalendarDays,
};
const NAV_CATEGORIES = ['OVERVIEW', 'MODERATION', 'SUPPORT', 'COMMUNITY', 'AUTOMATION', 'ENGAGEMENT', 'INSIGHTS', 'SYSTEM'] as const;

export function Sidebar({ session, isOwner }: { session: Session; isOwner: boolean }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // The URL remains the sole tenant identity; links do not grant access.
  const activeGuildId = pathname.match(/^\/dashboard\/(\d+)/)?.[1] || '';
  const getHref = (id: string, href: string) => id === 'select-server' || !activeGuildId
    ? '/dashboard/select-server' : `/dashboard/${activeGuildId}${href}`;
  const user = session.user;
  const displayName = user?.displayName || user?.name || 'User';

  const navigation = <nav aria-label="Dashboard navigation" className="dashboard-navigation">
    {NAV_CATEGORIES.map(category => <div key={category} className="mb-5">
      <p className="sidebar-category">{CATEGORY_LABELS[category]}</p>
      <ul className="space-y-1">{DASHBOARD_MODULES.filter(item => item.category === category).map(item => {
        const href = getHref(item.id, item.href);
        const active = item.id === 'select-server' ? pathname === href : Boolean(activeGuildId) && (pathname === href || (item.id !== 'overview' && pathname.startsWith(href + '/')));
        const Icon = ICON_MAP[item.icon] || LayoutDashboard;
        return <li key={item.id}><Link href={href} aria-current={active ? 'page' : undefined} onClick={() => setIsMobileOpen(false)} className={`sidebar-nav-item ${active ? 'active' : ''}`}><Icon size={16} aria-hidden="true" /><span className="truncate">{item.label}</span></Link></li>;
      })}</ul>
    </div>)}
  </nav>;

  const account = <div className="sidebar-account">
    <div className="mb-3 flex min-w-0 items-center gap-3">
      {user?.avatar && user.discordId ? <img src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`} alt="" width={32} height={32} className="rounded-lg" />
        : <span className="sidebar-avatar">{displayName.charAt(0).toUpperCase()}</span>}
      <div className="min-w-0"><p className="truncate text-sm font-medium">{displayName}</p><p className="text-xs text-[var(--text-secondary)]">Discord account</p></div>
    </div>
    <Button variant="secondary" size="sm" className="w-full" onClick={() => signOut({ callbackUrl: '/login' })}><LogOut size={14} />Sign out</Button>
  </div>;

  return <>
    <div className="dashboard-mobile-bar"><Link href={activeGuildId ? `/dashboard/${activeGuildId}` : '/dashboard/select-server'} className="dashboard-brand"><span className="dashboard-brand-mark">K</span>KRAXXBot</Link><IconButton label="Open navigation" aria-expanded={isMobileOpen} onClick={() => setIsMobileOpen(true)}><Menu size={20} /></IconButton></div>
    <aside className="dashboard-sidebar">
      <Link href={activeGuildId ? `/dashboard/${activeGuildId}` : '/dashboard/select-server'} className="dashboard-brand"><span className="dashboard-brand-mark">K</span><span>KRAXXBot<span className="block text-xs font-normal text-[var(--text-secondary)]">Server management</span></span></Link>
      {navigation}{isOwner && <div className="mb-5"><p className="sidebar-category">Owner</p><ul className="space-y-1">
        {[['Overview', '/dashboard/owner'], ['Servers', '/dashboard/owner/servers'], ['AI', '/dashboard/owner/ai'], ['Commands', '/dashboard/owner/commands'], ['Health', '/dashboard/owner/health'], ['Activity', '/dashboard/owner/activity'], ['Settings', '/dashboard/owner/settings']].map(([label, href]) => <li key={href}><Link href={href} aria-current={pathname === href || (href !== '/dashboard/owner' && pathname.startsWith(`${href}/`)) ? 'page' : undefined} onClick={() => setIsMobileOpen(false)} className={`sidebar-nav-item ${pathname === href || (href !== '/dashboard/owner' && pathname.startsWith(`${href}/`)) ? 'active' : ''}`}><Shield size={16} aria-hidden="true" /><span className="truncate">{label}</span></Link></li>)}
      </ul></div>}{account}
    </aside>
    <Modal isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} title="Navigation" maxWidth="sm">{navigation}{account}</Modal>
  </>;
}
