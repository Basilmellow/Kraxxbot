import { env } from '../src/config/environment';
import { getChannelDiagnostics } from '../src/config/channels';
import { ORGANIZATIONAL_ROLES } from '../src/config/roles';
import { initializeDatabase } from '../src/database/client';

async function validate() {
  console.log('============================================================');
  console.log('🔍 KRAXX HQ - SYSTEM CONFIGURATION DIAGNOSTIC VALIDATOR');
  console.log('============================================================');

  console.log('\n[1/3] Environment Parsing:');
  console.log(`• NODE_ENV: ${env.NODE_ENV}`);
  console.log(`• LOG_LEVEL: ${env.LOG_LEVEL}`);
  console.log(`• DISCORD_CLIENT_ID: ${env.DISCORD_CLIENT_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`• DISCORD_GUILD_ID: ${env.DISCORD_GUILD_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`• DATABASE_URL: ${env.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);

  console.log('\n[2/3] Organizational Roles Readiness:');
  for (const role of Object.values(ORGANIZATIONAL_ROLES)) {
    const isConfigured = Boolean(role.id && role.id.trim().length > 0);
    console.log(`  ${isConfigured ? '✅' : '⚠️'} ${role.name.padEnd(20)}: ${isConfigured ? `ID ${role.id}` : 'UNCONFIGURED PLACEHOLDER'}`);
  }

  console.log('\n[3/3] Discord Channels Readiness:');
  const channelDiags = getChannelDiagnostics();
  for (const ch of channelDiags) {
    console.log(`  ${ch.configured ? '✅' : '⚠️'} ${ch.name.padEnd(25)}: ${ch.configured ? `ID ${ch.id}` : 'UNCONFIGURED PLACEHOLDER'}`);
  }

  console.log('\nTesting Database Connection...');
  try {
    await initializeDatabase();
    console.log('✅ Database Connection Test Passed.');
  } catch (err) {
    console.error('❌ Database Connection Test Failed:', err);
  }

  console.log('\n============================================================');
  console.log('Diagnostic validation complete.');
  console.log('============================================================');
  process.exit(0);
}

validate();
