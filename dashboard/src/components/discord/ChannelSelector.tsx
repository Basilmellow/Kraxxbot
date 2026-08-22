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
      <label className="block text-[11px] font-mono font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
        TARGET DISCORD CHANNEL
      </label>

      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center justify-between p-2.5 rounded bg-[#070B10] border border-[#16202E] hover:border-[#22D3EE]/40 text-xs text-[#F1F5F9] focus:outline-none transition-all disabled:opacity-50 font-mono"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedChannel ? (
            <>
              {selectedChannel.type === 'announcement' ? (
                <Megaphone className="w-3.5 h-3.5 text-[#22D3EE] flex-shrink-0" />
              ) : (
                <Hash className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
              )}
              <span className="font-semibold text-[#F1F5F9] truncate">#{selectedChannel.name}</span>
              <span className="text-[10px] text-[#64748B] bg-[#0A0F16] px-1.5 py-0.5 rounded border border-[#16202E]">
                {selectedChannel.category}
              </span>
            </>
          ) : (
            <span className="text-[#64748B]">Select target Discord channel...</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-md bg-[#0A0F16] border border-[#1E2C3F] shadow-[0_12px_40px_rgba(0,0,0,0.8)] p-2 max-h-72 flex flex-col font-mono">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3 h-3 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 font-mono"
                autoFocus
              />
            </div>

            {/* Channels List */}
            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {groupedChannels.length === 0 ? (
                <div className="text-center py-5 text-[11px] text-[#64748B]">NO CHANNELS FOUND</div>
              ) : (
                groupedChannels.map(([cat, list]) => (
                  <div key={cat} className="space-y-0.5">
                    <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider px-2 pt-1 flex items-center justify-between">
                      <span>{cat}</span>
                      <span className="text-[#475569]">{list.length}</span>
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#22D3EE]/10 text-[#22D3EE] font-semibold border-l-2 border-[#22D3EE]'
                              : 'text-[#94A3B8] hover:bg-[#0D131C] hover:text-[#F1F5F9]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {c.type === 'announcement' ? (
                              <Megaphone className="w-3.5 h-3.5 text-[#22D3EE] flex-shrink-0" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
                            )}
                            <span className="truncate">#{c.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#22D3EE]" />}
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
