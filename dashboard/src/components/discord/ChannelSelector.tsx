'use client';

import React, { useState, useMemo } from 'react';
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
      <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wider">
        Target Discord Channel
      </label>

      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] hover:border-[#00f0ff]/40 text-xs text-[#e2e8f0] focus:outline-none transition-all disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedChannel ? (
            <>
              {selectedChannel.type === 'announcement' ? (
                <Megaphone className="w-4 h-4 text-[#00f0ff] flex-shrink-0" />
              ) : (
                <Hash className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />
              )}
              <span className="font-medium text-[#e2e8f0] truncate">{selectedChannel.name}</span>
              <span className="text-[10px] text-[#64748b] bg-[#141a22] px-1.5 py-0.5 rounded border border-[#1e2a38]">
                {selectedChannel.category}
              </span>
            </>
          ) : (
            <span className="text-[#64748b]">Select a Discord channel...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-[#0f1318] border border-[#1e2a38] shadow-2xl p-2 max-h-72 flex flex-col">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#00f0ff]/50"
                autoFocus
              />
            </div>

            {/* Channels List */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {groupedChannels.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#64748b]">No channels found</div>
              ) : (
                groupedChannels.map(([cat, list]) => (
                  <div key={cat} className="space-y-1">
                    <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider px-2 pt-1">
                      {cat}
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#00f0ff]/10 text-[#00f0ff] font-medium'
                              : 'text-[#94a3b8] hover:bg-[#141a22] hover:text-[#e2e8f0]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {c.type === 'announcement' ? (
                              <Megaphone className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-[#64748b] flex-shrink-0" />
                            )}
                            <span className="truncate">{c.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#00f0ff]" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
