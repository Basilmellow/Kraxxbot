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
      <label className="block text-xs font-semibold text-[#344054] mb-1.5">
        Target Discord Channel
      </label>

      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-indigo-300 text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 shadow-xs"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedChannel ? (
            <>
              {selectedChannel.type === 'announcement' ? (
                <Megaphone className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              ) : (
                <Hash className="w-3.5 h-3.5 text-[#667085] flex-shrink-0" />
              )}
              <span className="font-medium text-[#101828] truncate">#{selectedChannel.name}</span>
              <span className="text-[10px] text-[#667085] bg-[#F3F5FA] px-1.5 py-0.5 rounded-md border border-[#E5E7EB]">
                {selectedChannel.category}
              </span>
            </>
          ) : (
            <span className="text-[#98A2B3]">Select target Discord channel...</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#667085] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white border border-[#E5E7EB] shadow-xl p-2 max-h-72 flex flex-col">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
            </div>

            {/* Channels List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {groupedChannels.length === 0 ? (
                <div className="text-center py-5 text-xs text-[#667085]">No channels found</div>
              ) : (
                groupedChannels.map(([cat, list]) => (
                  <div key={cat} className="space-y-0.5">
                    <div className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider px-2 pt-1 flex items-center justify-between">
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-900 font-semibold'
                              : 'text-[#475467] hover:bg-[#F8FAFC] hover:text-[#101828]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {c.type === 'announcement' ? (
                              <Megaphone className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                            ) : (
                              <Hash className="w-3.5 h-3.5 text-[#667085] flex-shrink-0" />
                            )}
                            <span className="truncate">#{c.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
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
