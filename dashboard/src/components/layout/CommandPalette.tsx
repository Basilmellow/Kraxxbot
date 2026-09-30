'use client';

import React, { useCallback, useState, useEffect, useRef, useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Search, LayoutDashboard, Ticket, Users, Shield, Megaphone, CheckSquare, ScrollText, Sparkles, X, CornerDownLeft } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DASHBOARD_MODULES } from '@/lib/constants';

interface SearchResultItem {
  id: string;
  label: string;
  category: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

interface ApiSearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

function isApiSearchResult(value: unknown): value is ApiSearchResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;
  return typeof result.type === 'string' && typeof result.id === 'string'
    && typeof result.title === 'string' && typeof result.subtitle === 'string'
    && typeof result.url === 'string';
}

const QUICK_ACTIONS: SearchResultItem[] = [
  { id: 'act-new-embed', label: 'Compose Discord Embed', category: 'ACTION', href: '/messages/embed', icon: Sparkles, description: 'Open interactive rich embed builder' },
  { id: 'act-announce', label: 'Schedule Announcement', category: 'ACTION', href: '/announcements', icon: Megaphone, description: 'Broadcast message to target channels' },
  { id: 'act-mod', label: 'Moderation Console', category: 'ACTION', href: '/moderation', icon: Shield, description: 'Execute warn, timeout, kick, or ban actions' },
  { id: 'act-task', label: 'Open Tasks Board', category: 'ACTION', href: '/tasks', icon: CheckSquare, description: 'View operations pipeline and task statuses' },
  { id: 'act-audit', label: 'View Real-time Audit Logs', category: 'ACTION', href: '/audit', icon: ScrollText, description: 'Inspect full audit telemetry & timestamps' },
  { id: 'act-members', label: 'Operator Directory', category: 'ACTION', href: '/members', icon: Users, description: 'Lookup guild members and clearances' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [apiResults, setApiResults] = useState<ApiSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultId = useId();
  const router = useRouter();
  const guildId = useGuildId();

  const openPalette = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    setIsOpen(true);
  }, []);

  // Listen for global custom event or keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) setIsOpen(false);
        else openPalette();
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleOpenCommandPalette = () => {
      openPalette();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenCommandPalette);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenCommandPalette);
    };
  }, [isOpen, openPalette]);

  useEffect(() => {
    if (isOpen) {
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(focusTimer);
    }
    return undefined;
  }, [isOpen]);

  // Debounced API search when query is >= 2 chars
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        if (!guildId) return;
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&guildId=${encodeURIComponent(guildId)}`, { signal: controller.signal });
        if (res.ok) {
          const data: unknown = await res.json();
          if (typeof data === 'object' && data !== null && 'results' in data && Array.isArray(data.results)) {
            setApiResults(data.results.filter(isApiSearchResult));
          }
        }
      } catch {
        if (!controller.signal.aborted) console.error('Command search failed.');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, guildId]);

  // Filter modules
  const filteredModules = DASHBOARD_MODULES.filter((m) =>
    m.label.toLowerCase().includes(query.toLowerCase()) ||
    m.category.toLowerCase().includes(query.toLowerCase())
  ).map((m) => ({
    id: m.id,
    label: m.label,
    category: `NAV // ${m.category}`,
    href: m.id === 'select-server'
      ? '/dashboard/select-server'
      : guildId
        ? `/dashboard/${guildId}${m.href}`
        : '/dashboard/select-server',
    icon: LayoutDashboard,
    description: `Jump to ${m.label}`,
  }));

  const filteredActions = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    (a.description && a.description.toLowerCase().includes(query.toLowerCase()))
  ).map((action) => ({
    ...action,
    href: guildId ? `/dashboard/${guildId}${action.href}` : '/dashboard/select-server',
  }));

  const allItems: SearchResultItem[] = [
    ...filteredModules,
    ...filteredActions,
    ...(query.trim().length >= 2 ? apiResults : []).map((r) => ({
      id: r.id,
      label: r.title,
      category: `SEARCH // ${r.type.toUpperCase() || 'DATA'}`,
      href: r.url,
      icon: Ticket,
      description: r.subtitle,
    })),
  ];

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    router.push(item.href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const index = (selectedIndex + 1) % Math.max(1, allItems.length);
      setSelectedIndex(index);
      document.getElementById(`${resultId}-${index}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const index = (selectedIndex - 1 + allItems.length) % Math.max(1, allItems.length);
      setSelectedIndex(index);
      document.getElementById(`${resultId}-${index}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(allItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Search dashboard" maxWidth="xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2A2925] bg-[#10100F]">
          <Search className="w-4 h-4 text-[#C9A66B] flex-shrink-0" />
          <input
            ref={inputRef}
            aria-label="Search dashboard"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={resultId}
            aria-activedescendant={allItems[selectedIndex] ? `${resultId}-${selectedIndex}` : undefined}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, search pages, tickets, members, or tools..."
            className="min-w-0 flex-1 bg-transparent border-none text-sm text-[#F3F0E9] placeholder-[#716D65] focus:outline-none"
          />
          {query && (
            <button
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="p-1 text-[#716D65] hover:text-[#F3F0E9]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] text-[#A8A49B] px-1.5 py-0.5 rounded bg-[#1D1C19] border border-[#2A2925] font-sans font-medium">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div id={resultId} role="listbox" aria-label="Search results" className="max-h-[50dvh] overflow-y-auto py-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A8A49B]">
              No matching commands or pages found.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  type="button" role="option" tabIndex={-1}
                  id={`${resultId}-${idx}`} aria-selected={isSelected}
                  key={`${item.id}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors text-xs ${
                    isSelected
                      ? 'bg-[#C9A66B]/10 text-[#F3F0E9] border-l-2 border-[#C9A66B]'
                      : 'text-[#A8A49B] hover:bg-[#1D1C19] hover:text-[#F3F0E9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-semibold text-[#A8A49B] px-1.5 py-0.5 rounded bg-[#1D1C19] border border-[#2A2925] uppercase">
                      {item.category}
                    </span>
                    <span className="font-medium text-[#F3F0E9] truncate">{item.label}</span>
                    {item.description && (
                      <span className="text-[11px] text-[#716D65] truncate hidden sm:inline">
                        — {item.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-[#C9A66B] flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Command Footer */}
        <div className="px-4 py-2.5 bg-[#10100F] border-t border-[#2A2925] flex items-center justify-between text-[11px] text-[#716D65]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-[#C9A66B] font-medium">KRAXXBot</span>
        </div>
    </Modal>
  );
}
