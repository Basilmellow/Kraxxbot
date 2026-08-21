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
    <div>
      <Topbar
        title="Server Utilities"
        subtitle="Cryptographic Snowflake Decoders, Discord Timestamps & Permission Utilities"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool 1: Snowflake Decoder */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle>
                <Hash className="w-4 h-4 text-[#00f0ff]" />
                <span>Snowflake Timestamp Decoder</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-3 text-xs">
              <p className="text-[#94a3b8]">
                Decode any Discord User, Message, Role, or Channel Snowflake ID into its exact UTC creation timestamp and worker node parameters.
              </p>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Snowflake ID</label>
                <input
                  type="text"
                  placeholder="e.g. 109283746592018475"
                  value={snowflakeInput}
                  onChange={(e) => handleCalculateSnowflake(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00f0ff]/50"
                />
              </div>

              {snowflakeResult ? (
                <div className="p-4 rounded-xl bg-[#0f1318] border border-[#00f0ff]/30 space-y-2 animate-fade-in">
                  <div>
                    <span className="text-[#64748b] text-[10px] uppercase font-mono">Creation UTC Timestamp</span>
                    <div className="text-sm font-bold text-[#00f0ff] font-mono">
                      {snowflakeResult.timestamp.toUTCString()}
                    </div>
                    <div className="text-xs text-[#94a3b8] font-mono">
                      Local: {snowflakeResult.timestamp.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1e2a38] text-[11px] font-mono text-[#94a3b8]">
                    <div>Worker ID: <span className="text-[#e2e8f0]">{snowflakeResult.workerId.toString()}</span></div>
                    <div>Process ID: <span className="text-[#e2e8f0]">{snowflakeResult.processId.toString()}</span></div>
                    <div>Increment: <span className="text-[#e2e8f0]">{snowflakeResult.increment.toString()}</span></div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#0f1318] border border-[#1e2a38] text-center text-[#64748b] italic">
                  Enter a valid 17-20 digit Discord Snowflake ID to decode.
                </div>
              )}
            </div>
          </Card>

          {/* Tool 2: Discord Timestamp Generator */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle>
                <Clock className="w-4 h-4 text-[#00f0ff]" />
                <span>Discord Dynamic Timestamp Generator</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-3 text-xs">
              <p className="text-[#94a3b8]">
                Generate live dynamic countdown and timezone-localized timestamp tags for Discord messages and embeds.
              </p>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Select Target Date & Time</label>
                <input
                  type="datetime-local"
                  value={timestampDate}
                  onChange={(e) => setTimestampDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00f0ff]/50"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1e2a38]">
                {timestampFormats.map((tf) => (
                  <div
                    key={tf.format}
                    className="p-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-[#00f0ff]">{tf.format}</span>
                      <span className="text-[10px] text-[#64748b] block">{tf.desc}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(tf.format, tf.format)}
                    >
                      {copiedFormat === tf.format ? (
                        <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
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
