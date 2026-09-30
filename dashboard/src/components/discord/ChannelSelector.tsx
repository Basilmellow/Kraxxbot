'use client';

import { Input } from '@/components/ui/Form';

import React, { useState, useMemo, useId } from 'react';
import { Dropdown } from '@/components/ui/Dropdown';
import { Hash, Megaphone, Search, ChevronDown, Check } from 'lucide-react';

export interface ChannelItem {
  id: string;
  name: string;
  type: 'text' | 'announcement';
  category: string;
}

interface ChannelSelectorProps {
  channels: ChannelItem[];
  selectedChannelId: string;
  onSelectChannel: (channel: ChannelItem) => void;
  isLoading?: boolean;
}

export function ChannelSelector({
  channels,
  selectedChannelId,
  onSelectChannel,
  isLoading,
}: ChannelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const labelId = useId();

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId),
    [channels, selectedChannelId]
  );

  const filteredChannels = useMemo(() => {
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [channels, search]);

  const groupedChannels = useMemo(() => {
    const map = new Map<string, ChannelItem[]>();
    for (const ch of filteredChannels) {
      const list = map.get(ch.category) || [];
      list.push(ch);
      map.set(ch.category, list);
    }
    return Array.from(map.entries());
  }, [filteredChannels]);

  return (
    <div className="relative w-full">
      <p id={labelId} className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">
        Target Discord Channel
      </p>

      {/* Selector Trigger Button */}
      <button
        type="button"
        aria-labelledby={labelId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-base)] hover:border-[var(--accent-border)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors disabled:opacity-50 "
      >
        <div className="flex items-center gap-2 truncate">
          {selectedChannel ? (
            <>
              {selectedChannel.type === 'announcement' ? (
                <Megaphone className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
              ) : (
                <Hash className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
              )}
              <span className="font-medium text-[var(--text-primary)] truncate">#{selectedChannel.name}</span>
              <span className="text-[13px] text-[var(--text-secondary)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-md border border-[var(--border-base)]">
                {selectedChannel.category}
              </span>
            </>
          ) : (
            <span className="text-[var(--text-secondary)]">Select target Discord channel...</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Dropdown label="Channel selection" onClose={() => setIsOpen(false)} className="right-0 p-2 max-h-72 flex flex-col">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input aria-label="Search channels..."
                type="text"
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3"
                autoFocus
              />
            </div>

            {/* Channels List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {groupedChannels.length === 0 ? (
                <div className="text-center py-5 text-[13px] text-[var(--text-secondary)]">No channels found</div>
              ) : (
                groupedChannels.map(([cat, list]) => (
                  <div key={cat} className="space-y-0.5">
                    <div className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-2 pt-1 flex items-center justify-between">
                      <span>{cat}</span>
                      <span>{list.length}</span>
                    </div>
                    {list.map((c) => {
                      const isSelected = c.id === selectedChannelId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onSelectChannel(c);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {c.type === 'announcement' ? (
                              <Megaphone className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                            )}
                            <span className="truncate">#{c.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </Dropdown>
        </>
      )}
    </div>
  );
}
