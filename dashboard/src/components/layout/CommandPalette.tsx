'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Ticket,
  Users,
  Shield,
  MessageSquare,
  Megaphone,
  CheckSquare,
  AlarmClock,
  CalendarClock,
  Zap,
  BarChart3,
  ScrollText,
  Settings,
  Boxes,
  Wrench,
  Sparkles,
  DoorOpen,
  Vote,
  Gamepad2,
  X,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { DASHBOARD_MODULES } from '@/lib/constants';

interface SearchResultItem {
  id: string;
  label: string;
  category: string;
  href: string;
  icon: any;
  description?: string;
}

const QUICK_ACTIONS: SearchResultItem[] = [
  { id: 'act-new-embed', label: 'Compose Discord Embed', category: 'ACTION', href: '/dashboard/messages/embed', icon: Sparkles, description: 'Open interactive rich embed builder' },
  { id: 'act-announce', label: 'Schedule Announcement', category: 'ACTION', href: '/dashboard/announcements', icon: Megaphone, description: 'Broadcast message to target channels' },
  { id: 'act-mod', label: 'Moderation Console', category: 'ACTION', href: '/dashboard/moderation', icon: Shield, description: 'Execute warn, timeout, kick, or ban actions' },
  { id: 'act-task', label: 'Open Tasks Board', category: 'ACTION', href: '/dashboard/tasks', icon: CheckSquare, description: 'View operations pipeline and task statuses' },
  { id: 'act-audit', label: 'View Real-time Audit Logs', category: 'ACTION', href: '/dashboard/audit', icon: ScrollText, description: 'Inspect full audit telemetry & timestamps' },
  { id: 'act-members', label: 'Operator Directory', category: 'ACTION', href: '/dashboard/members', icon: Users, description: 'Lookup guild members and clearances' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for global custom event or keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleOpenCommandPalette = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenCommandPalette);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenCommandPalette);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced API search when query is >= 2 chars
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingApi(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setApiResults(data.results || []);
        }
      } catch (err) {
        console.error('Command search error:', err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter modules
  const filteredModules = DASHBOARD_MODULES.filter((m) =>
    m.label.toLowerCase().includes(query.toLowerCase()) ||
    m.category.toLowerCase().includes(query.toLowerCase())
  ).map((m) => ({
    id: m.id,
    label: m.label,
    category: `NAV // ${m.category}`,
    href: m.href,
    icon: LayoutDashboard,
    description: `Jump to ${m.label}`,
  }));

  const filteredActions = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    (a.description && a.description.toLowerCase().includes(query.toLowerCase()))
  );

  const allItems: SearchResultItem[] = [
    ...filteredModules,
    ...filteredActions,
    ...apiResults.map((r: any) => ({
      id: r.id || String(Math.random()),
      label: r.title || r.name || r.id,
      category: `TELEMETRY // ${r.type?.toUpperCase() || 'DATA'}`,
      href: r.url || r.href || '/dashboard',
      icon: Ticket,
      description: r.subtitle || r.details || r.status,
    })),
  ];

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    router.push(item.href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(allItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#05070B]/80 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-xl rounded-md bg-[#0A0F16] border border-[#1E2C3F] shadow-[0_16px_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#16202E] bg-[#070B10]">
          <Search className="w-4 h-4 text-[#22D3EE] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, search telemetry, tickets, members, or tools..."
            className="flex-1 bg-transparent border-none text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#64748B] hover:text-[#F1F5F9]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono text-[#64748B] px-1.5 py-0.5 rounded bg-[#111823] border border-[#16202E]">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B] font-mono">
              NO MATCHING COMMANDS OR TELEMETRY FOUND
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded-sm cursor-pointer flex items-center justify-between transition-colors text-xs ${
                    isSelected
                      ? 'bg-[#111823] text-[#22D3EE] border-l-2 border-[#22D3EE]'
                      : 'text-[#94A3B8] hover:bg-[#0D131C] hover:text-[#F1F5F9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] text-[#64748B] px-1.5 py-0.5 rounded bg-[#070B10] border border-[#16202E] uppercase">
                      {item.category}
                    </span>
                    <span className="font-medium text-[#F1F5F9] truncate">{item.label}</span>
                    {item.description && (
                      <span className="text-[11px] text-[#64748B] truncate hidden sm:inline">
                        — {item.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-[#22D3EE] flex-shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Command Footer */}
        <div className="px-4 py-2 bg-[#070B10] border-t border-[#16202E] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
          <div className="flex items-center gap-3">
            <span>↑↓ NAVIGATE</span>
            <span>↵ EXECUTE</span>
            <span>ESC DISMISS</span>
          </div>
          <span className="text-[#22D3EE]">KRAXX HQ // COMMAND SYSTEM</span>
        </div>
      </div>
    </div>
  );
}
