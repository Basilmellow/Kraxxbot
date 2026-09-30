const SNOWFLAKE = /^\d{17,20}$/;
const ALLOWED_KEYS = new Set([
  'guildId', 'enabled', 'channelId', 'message', 'embedJson', 'imageUrl', 'roleId',
  'dmEnabled', 'dmMessage', 'leaveChannelId', 'leaveMessage',
]);

export class WelcomeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WelcomeConfigError';
  }
}

export type WelcomeConfigInput = {
  guildId: string;
  enabled: boolean;
  channelId: string | null;
  message: string | null;
  embedJson: string | null;
  imageUrl: string | null;
  roleId: string | null;
  dmEnabled: boolean;
  dmMessage: string | null;
  leaveChannelId: string | null;
  leaveMessage: string | null;
};

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new WelcomeConfigError(`Invalid ${field}.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new WelcomeConfigError(`${field} is too long.`);
  return normalized || null;
}

function optionalId(value: unknown, field: string): string | null {
  const normalized = optionalText(value, field, 20);
  if (normalized !== null && !SNOWFLAKE.test(normalized))
    throw new WelcomeConfigError(`Invalid ${field}.`);
  return normalized;
}

export function parseWelcomeConfig(value: unknown): WelcomeConfigInput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new WelcomeConfigError('Invalid welcome configuration.');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !ALLOWED_KEYS.has(key)))
    throw new WelcomeConfigError('Unknown welcome configuration field.');
  if (typeof body.guildId !== 'string' || !SNOWFLAKE.test(body.guildId))
    throw new WelcomeConfigError('Invalid guild ID.');
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean')
    throw new WelcomeConfigError('Invalid enabled state.');
  if (body.dmEnabled !== undefined && typeof body.dmEnabled !== 'boolean')
    throw new WelcomeConfigError('Invalid DM enabled state.');

  const imageUrl = optionalText(body.imageUrl, 'image URL', 2048);
  if (imageUrl) {
    let parsed: URL;
    try { parsed = new URL(imageUrl); } catch { throw new WelcomeConfigError('Invalid image URL.'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new WelcomeConfigError('Image URL must use HTTPS and cannot contain credentials.');
  }

  let embedJson = optionalText(body.embedJson, 'embed data', 6000);
  if (embedJson) {
    try {
      const parsed: unknown = JSON.parse(embedJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      embedJson = JSON.stringify(parsed);
    } catch {
      throw new WelcomeConfigError('Invalid embed data.');
    }
  }

  return {
    guildId: body.guildId,
    enabled: body.enabled === true,
    channelId: optionalId(body.channelId, 'welcome channel'),
    message: optionalText(body.message, 'welcome message', 2000),
    embedJson,
    imageUrl,
    roleId: optionalId(body.roleId, 'role'),
    dmEnabled: body.dmEnabled === true,
    dmMessage: optionalText(body.dmMessage, 'direct message', 2000),
    leaveChannelId: optionalId(body.leaveChannelId, 'departure channel'),
    leaveMessage: optionalText(body.leaveMessage, 'departure message', 2000),
  };
}
