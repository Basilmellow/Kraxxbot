export const AUTOMATION_TRIGGERS = ['MEMBER_JOIN', 'MEMBER_LEAVE'] as const;
export const AUTOMATION_ACTIONS = ['SEND_MESSAGE', 'SEND_DM'] as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number];
export type AutomationConfig = { channelId?: string; message: string };

export function validateAutomationConfig(trigger: unknown, action: unknown, rawConfig: unknown): AutomationConfig {
  if (!AUTOMATION_TRIGGERS.includes(trigger as AutomationTrigger)) throw new Error('UnsupportedAutomationTrigger');
  if (!AUTOMATION_ACTIONS.includes(action as AutomationAction)) throw new Error('UnsupportedAutomationAction');

  let config: unknown = rawConfig;
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { throw new Error('InvalidAutomationConfig'); }
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('InvalidAutomationConfig');
  const input = config as Record<string, unknown>;
  if (Object.keys(input).some((key) => !['channelId', 'message'].includes(key))) throw new Error('UnexpectedAutomationConfigField');
  if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > 2000) throw new Error('InvalidAutomationMessage');

  if (action === 'SEND_MESSAGE') {
    if (typeof input.channelId !== 'string' || !/^\d{17,20}$/.test(input.channelId)) throw new Error('InvalidAutomationChannel');
    return { channelId: input.channelId, message: input.message.trim() };
  }

  if (input.channelId !== undefined) throw new Error('UnexpectedAutomationChannel');
  return { message: input.message.trim() };
}
