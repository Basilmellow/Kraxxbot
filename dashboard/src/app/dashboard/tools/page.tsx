'use client';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Wrench,
  Clock,
  Key,
  Copy,
  Check,
  Hash,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

const DISCORD_EPOCH = BigInt('1420070400000');

export default function ServerToolsPage() {
  // Snowflake Tool State
  const [snowflakeInput, setSnowflakeInput] = useState('');
  const [snowflakeResult, setSnowflakeResult] = useState<{
    timestamp: Date;
    workerId: bigint;
    processId: bigint;
    increment: bigint;
  } | null>(null);

  // Timestamp Generator State
  const [timestampDate, setTimestampDate] = useState(new Date().toISOString().slice(0, 16));
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Snowflake calculation
  const handleCalculateSnowflake = (val: string) => {
    setSnowflakeInput(val);
    if (!val.trim() || !/^\d{17,20}$/.test(val.trim())) {
      setSnowflakeResult(null);
      return;
    }
    try {
      const snowflake = BigInt(val.trim());
      const timestampMs = Number((snowflake >> BigInt(22)) + DISCORD_EPOCH);
      const workerId = (snowflake & BigInt('0x3e0000')) >> BigInt(17);
      const processId = (snowflake & BigInt('0x1f000')) >> BigInt(12);
      const increment = snowflake & BigInt('0xfff');

      setSnowflakeResult({
        timestamp: new Date(timestampMs),
        workerId,
        processId,
        increment,
      });
    } catch {
      setSnowflakeResult(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(key);
    setTimeout(() => setCopiedFormat(null), 1500);
  };

  const getUnixTimestamp = () => {
    const d = new Date(timestampDate);
    return Math.floor((isNaN(d.getTime()) ? Date.now() : d.getTime()) / 1000);
  };

  const unixTs = getUnixTimestamp();
  const timestampFormats = [
    { format: `<t:${unixTs}:R>`, desc: 'Relative Time (e.g. in 2 hours)', preview: 'in a few moments' },
    { format: `<t:${unixTs}:F>`, desc: 'Long Date / Time (Full)', preview: new Date(unixTs * 1000).toLocaleString() },
    { format: `<t:${unixTs}:f>`, desc: 'Short Date / Time', preview: new Date(unixTs * 1000).toLocaleDateString() },
    { format: `<t:${unixTs}:D>`, desc: 'Long Date', preview: new Date(unixTs * 1000).toDateString() },
    { format: `<t:${unixTs}:d>`, desc: 'Short Date', preview: new Date(unixTs * 1000).toLocaleDateString() },
    { format: `<t:${unixTs}:T>`, desc: 'Long Time', preview: new Date(unixTs * 1000).toLocaleTimeString() },
    { format: `<t:${unixTs}:t>`, desc: 'Short Time', preview: new Date(unixTs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Server Utilities & Gateway Tools"
        subtitle="Cryptographic Snowflake Decoders, Discord Timestamps & Gateway Formatting"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6 text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool 1: Snowflake Decoder */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F9]">
              <Hash className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-[#101828]">
                Discord Snowflake ID Decoder
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Discord Snowflake ID
                </label>
                <input
                  type="text"
                  placeholder="Paste user, message, or channel ID (e.g. 104829104928104829)"
                  value={snowflakeInput}
                  onChange={(e) => handleCalculateSnowflake(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-mono text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {snowflakeResult ? (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Creation Timestamp:</span>
                    <span className="font-semibold text-[#101828]">
                      {snowflakeResult.timestamp.toUTCString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Relative Age:</span>
                    <span className="text-indigo-600 font-medium">
                      {Math.floor((Date.now() - snowflakeResult.timestamp.getTime()) / (1000 * 60 * 60 * 24))} days ago
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Internal Worker / Process ID:</span>
                    <span className="font-mono text-[#475467]">
                      {snowflakeResult.workerId.toString()} / {snowflakeResult.processId.toString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#98A2B3] text-center">
                  Enter a valid 17-20 digit Discord Snowflake ID to inspect creation metadata.
                </div>
              )}
            </div>
          </Card>

          {/* Tool 2: Discord Timestamp Formatter */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F9]">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-[#101828]">
                Discord Dynamic Timestamp Generator
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Target Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={timestampDate}
                  onChange={(e) => setTimestampDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {timestampFormats.map((tf, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono text-indigo-600 font-semibold">{tf.format}</div>
                      <div className="text-[11px] text-[#667085]">{tf.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(tf.format, tf.format)}
                      className="p-1.5 rounded-lg text-[#667085] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Copy Syntax"
                    >
                      {copiedFormat === tf.format ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
