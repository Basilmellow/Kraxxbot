export const OWNER_COMMANDS = [
  ['moderate', 'Record and execute an authorized moderation action'], ['role', 'Role management and inspection system (Authorized Personnel Only)'],
  ['config', 'System diagnostic & configuration inspection'], ['setup', 'Publish system embeds and interactive panels'], ['announce', 'Publish a corporate announcement (Opens Modal Interface)'],
  ['event', 'Organizational event management'], ['task', 'Operational task management system'], ['remind', 'Personal & operational reminders manager'],
  ['meeting', 'Schedule and manage internal meetings'], ['project', 'Division project management directory'], ['client', 'Client relations & directory manager (Management Only)'],
  ['template', 'Operational document & message templates'], ['ping', 'Display KRAXX Bot operational latency & system status'],
  ['info', 'Overview of KRAXX HQ organization, divisions & bot architecture'], ['verify', 'Verify your server membership and gain base access'], ['say', 'Send a raw text message as KRAXX Bot (supports multiline text & formatting)'],
  ['sayembed', 'Send a formatted rich embed message as KRAXX Bot'], ['sayedit', 'Edit a message previously sent by KRAXX Bot'],
  ['sayreply', 'Send a reply to a message as KRAXX Bot'], ['saykeep', 'Pin and archive a message sent by KRAXX Bot'],
  ['selfrole', 'Self-assignable roles management and interaction system'], ['ticket', 'Comprehensive support ticket system'],
  ['custom', 'Run a server-configured custom response'], ['ask', 'Ask Kraxx AI a question'],
].map(([name, description]) => ({ name, description }));
