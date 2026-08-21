import React from 'react';

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedData {
  title?: string;
  description?: string;
  url?: string;
  color?: number | string;
  author?: {
    name?: string;
    icon_url?: string;
    url?: string;
  };
  fields?: EmbedField[];
  image?: {
    url?: string;
  };
  thumbnail?: {
    url?: string;
  };
  footer?: {
    text?: string;
    icon_url?: string;
  };
  timestamp?: string | boolean;
}

interface DiscordEmbedPreviewProps {
  embed: DiscordEmbedData;
  botName?: string;
  botAvatar?: string;
}

export function DiscordEmbedPreview({
  embed,
  botName = 'KRAXX Bot',
  botAvatar,
}: DiscordEmbedPreviewProps) {
  // Convert color to hex string if numeric or string
  let colorHex = '#00f0ff';
  if (typeof embed.color === 'number') {
    colorHex = `#${embed.color.toString(16).padStart(6, '0')}`;
  } else if (typeof embed.color === 'string' && embed.color.startsWith('#')) {
    colorHex = embed.color;
  }

  const fields = embed.fields || [];

  return (
    <div className="bg-[#313338] text-[#dbdee1] rounded-lg p-4 font-sans text-[15px] border border-[#232428] shadow-md max-w-2xl w-full">
      {/* Bot Message Header */}
      <div className="flex items-center gap-3 mb-2">
        {botAvatar ? (
          <img src={botAvatar} alt={botName} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center font-bold text-white text-sm">
            K
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
            {botName}
          </span>
          <span className="bg-[#5865f2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
            APP
          </span>
          <span className="text-[11px] text-[#949ba4]">Today at 12:00 PM</span>
        </div>
      </div>

      {/* Embed Container */}
      <div
        className="ml-13 bg-[#2b2d31] rounded-[4px] p-3 border-l-4 text-xs relative max-w-full overflow-hidden"
        style={{ borderLeftColor: colorHex }}
      >
        <div className="flex justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Author */}
            {embed.author?.name && (
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                {embed.author.icon_url && (
                  <img
                    src={embed.author.icon_url}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                )}
                {embed.author.url ? (
                  <a
                    href={embed.author.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-white truncate"
                  >
                    {embed.author.name}
                  </a>
                ) : (
                  <span className="truncate">{embed.author.name}</span>
                )}
              </div>
            )}

            {/* Title */}
            {embed.title && (
              <div className="font-bold text-sm text-white">
                {embed.url ? (
                  <a
                    href={embed.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00a8fc] hover:underline"
                  >
                    {embed.title}
                  </a>
                ) : (
                  embed.title
                )}
              </div>
            )}

            {/* Description */}
            {embed.description && (
              <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed text-xs">
                {embed.description}
              </div>
            )}

            {/* Fields Grid */}
            {fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {fields.map((f, idx) => (
                  <div
                    key={idx}
                    className={`${f.inline ? 'col-span-1' : 'col-span-full'} min-w-0`}
                  >
                    <div className="font-semibold text-white text-[11px] mb-0.5 truncate">
                      {f.name || 'Field'}
                    </div>
                    <div className="text-[#dbdee1] text-[11px] whitespace-pre-wrap leading-normal">
                      {f.value || 'Value'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          {embed.thumbnail?.url && (
            <div className="flex-shrink-0">
              <img
                src={embed.thumbnail.url}
                alt=""
                className="w-16 h-16 rounded object-cover"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            </div>
          )}
        </div>

        {/* Large Image */}
        {embed.image?.url && (
          <div className="mt-3">
            <img
              src={embed.image.url}
              alt=""
              className="max-h-60 rounded object-cover w-full"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          </div>
        )}

        {/* Footer & Timestamp */}
        {(embed.footer?.text || embed.timestamp) && (
          <div className="flex items-center gap-2 mt-2 pt-1 text-[10px] text-[#949ba4]">
            {embed.footer?.icon_url && (
              <img
                src={embed.footer.icon_url}
                alt=""
                className="w-4 h-4 rounded-full"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            )}
            <span>{embed.footer?.text || 'KRAXX Operations System'}</span>
            {embed.timestamp && (
              <>
                <span>•</span>
                <span>
                  {typeof embed.timestamp === 'string'
                    ? new Date(embed.timestamp).toLocaleString()
                    : new Date().toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
