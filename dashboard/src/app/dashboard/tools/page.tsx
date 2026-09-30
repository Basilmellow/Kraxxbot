'use client';

import { PageContainer } from '@/components/ui/Page';
import { Input } from '@/components/ui/Form';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';

import { Clock, Copy, Check, Hash } from 'lucide-react';

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
    return Math.floor((isNaN(d.getTime()) ? 0 : d.getTime()) / 1000);
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
        title="Tools"
        subtitle="Decode Discord IDs and format timestamps."
      />

      <PageContainer className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool 1: Snowflake Decoder */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6  space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-base)]">
              <Hash className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Discord Snowflake ID Decoder
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Discord Snowflake ID
                </label>
                <Input aria-label="Discord Snowflake ID"
                  type="text"
                  placeholder="Paste user, message, or channel ID (e.g. 104829104928104829)"
                  value={snowflakeInput}
                  onChange={(e) => handleCalculateSnowflake(e.target.value)}
                  className="w-full font-mono"
                />
              </div>

              {snowflakeResult ? (
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-2 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Creation Timestamp:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {snowflakeResult.timestamp.toUTCString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Internal Worker / Process ID:</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {snowflakeResult.workerId.toString()} / {snowflakeResult.processId.toString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] text-[13px] text-[var(--text-secondary)] text-center">
                  Enter a valid 17-20 digit Discord Snowflake ID to inspect creation metadata.
                </div>
              )}
            </div>
          </Card>

          {/* Tool 2: Discord Timestamp Formatter */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6  space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-base)]">
              <Clock className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Discord Dynamic Timestamp Generator
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Target Date & Time
                </label>
                <Input aria-label="Target Date & Time"
                  type="datetime-local"
                  value={timestampDate}
                  onChange={(e) => setTimestampDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {timestampFormats.map((tf, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] flex items-center justify-between text-[13px]"
                  >
                    <div>
                      <div className="font-mono text-[var(--accent)] font-semibold">{tf.format}</div>
                      <div className="text-[13px] text-[var(--text-secondary)]">{tf.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(tf.format, tf.format)}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors"
                      title="Copy Syntax"
                    >
                      {copiedFormat === tf.format ? (
                        <Check className="w-4 h-4 text-[var(--success)]" />
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
      </PageContainer>
    </div>
  );
}
