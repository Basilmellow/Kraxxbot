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
  Terminal,
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
        title="SERVER UTILITIES & TOOLS"
        subtitle="Cryptographic Snowflake Decoders, Discord Timestamps & Gateway Formatting"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          {/* Tool 1: Snowflake Decoder */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>SNOWFLAKE TIMESTAMP DECODER</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                  ENTER DISCORD ID (SNOWFLAKE)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1198765432109876543"
                  value={snowflakeInput}
                  onChange={(e) => handleCalculateSnowflake(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                />
              </div>

              {snowflakeResult ? (
                <div className="p-3.5 rounded bg-[#070B10] border border-[#16202E] space-y-2.5">
                  <div className="text-[10px] font-bold text-[#22D3EE] uppercase tracking-wider">
                    DECODED CRYPTOGRAPHIC METADATA
                  </div>
                  <div className="space-y-1.5 text-xs text-[#F1F5F9]">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">CREATION TIMESTAMP:</span>
                      <span className="font-bold">{snowflakeResult.timestamp.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">INTERNAL WORKER ID:</span>
                      <span>{snowflakeResult.workerId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">INTERNAL PROCESS ID:</span>
                      <span>{snowflakeResult.processId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">SEQUENCE INCREMENT:</span>
                      <span>{snowflakeResult.increment.toString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-[11px] text-[#64748B] rounded bg-[#070B10] border border-[#16202E]">
                  Enter a valid 17-20 digit Discord snowflake ID to extract generation timestamp and hardware identifiers.
                </div>
              )}
            </div>
          </Card>

          {/* Tool 2: Discord Timestamp Builder */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>DYNAMIC DISCORD TIMESTAMP BUILDER</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] text-[#94A3B8] uppercase mb-1">
                  SELECT TARGET DATE & TIME
                </label>
                <input
                  type="datetime-local"
                  value={timestampDate}
                  onChange={(e) => setTimestampDate(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {timestampFormats.map((tf) => (
                  <div
                    key={tf.format}
                    className="flex items-center justify-between p-2 rounded bg-[#070B10] border border-[#16202E]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-[#22D3EE] text-[11px]">{tf.format}</div>
                      <div className="text-[10px] text-[#64748B] truncate">{tf.desc}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(tf.format, tf.format)}
                      className="font-mono text-[10px] py-1 px-2 gap-1"
                    >
                      {copiedFormat === tf.format ? (
                        <>
                          <Check className="w-3 h-3 text-[#10B981]" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#64748B]" />
                          <span>COPY</span>
                        </>
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
