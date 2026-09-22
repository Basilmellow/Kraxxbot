import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy explaining how KRAXXBot processes information when providing Discord bot and dashboard services.',
};

function LegalNavigation() {
  return (
    <nav className="legal-nav" aria-label="Public navigation">
      <div className="legal-nav-inner">
        <Link href="/" className="legal-brand" aria-label="KRAXXBot home"><span className="legal-brand-mark" aria-hidden="true">K</span>KRAXXBot</Link>
        <div className="legal-nav-links"><Link href="/terms" className="legal-link">Terms of Service</Link><a href="https://discord.gg/kraxx" target="_blank" rel="noopener noreferrer" className="legal-link">Support</a></div>
      </div>
    </nav>
  );
}

function LegalFooter() {
  return (
    <footer className="legal-footer"><div className="legal-footer-inner"><div className="legal-footer-links"><Link href="/terms" className="legal-link">Terms of Service</Link><Link href="/privacy" className="legal-link">Privacy Policy</Link><a href="https://discord.gg/kraxx" target="_blank" rel="noopener noreferrer" className="legal-link">Support Server</a></div><p className="legal-footer-copy">© {new Date().getFullYear()} KRAXX. All rights reserved.</p></div></footer>
  );
}

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <LegalNavigation />
      <main className="legal-container legal-article">
        <p className="legal-eyebrow">KRAXXBot Legal</p>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: September 22, 2026</p>
        <p className="legal-intro">This policy explains how KRAXXBot processes information when providing its Discord bot and dashboard services.</p>

        <section className="legal-section"><h2>1. Overview</h2><p>KRAXXBot is a multi-tenant Discord application. It processes information required to authenticate dashboard users, operate enabled server features, and maintain the service. This policy describes the information reflected in the current KRAXXBot implementation.</p></section>
        <section className="legal-section"><h2>2. Information We May Process</h2><h3>Discord account information</h3><p>When you sign in to the dashboard through Discord OAuth2, KRAXXBot receives and uses your Discord user ID, username, display name, and avatar information. The dashboard session uses a Discord OAuth access token to support the signed-in experience.</p><h3>Discord server and member information</h3><p>KRAXXBot stores guild identifiers, names, icons, owner identifiers, and installation status. For members recorded by enabled features, it may store Discord IDs, usernames, display names, avatars, verification status, role tier, and relevant join or verification timestamps.</p><h3>Server configuration and feature data</h3><p>KRAXXBot stores guild-specific settings such as selected roles, channels, modules, locale, timezone, and configuration for features including tickets, welcome messages, automations, announcements, embeds, tasks, reminders, meetings, polls, suggestions, and self-assignable roles.</p><h3>Technical information</h3><p>Dashboard audit records may include the Discord ID of the person performing an action, action and target details, timestamps, source, and an IP address where recorded by the dashboard. The service also records operational status information, such as bot heartbeat, gateway status, latency, and version details.</p><h3>Information generated through use of KRAXXBot</h3><p>Depending on enabled features, KRAXXBot stores moderation cases, audit events, ticket metadata, notification records, task and scheduling information, and other records created through server administration and community use.</p></section>
        <section className="legal-section"><h2>3. How We Use Information</h2><p>We use this information to authenticate dashboard users, determine server access, provide and configure bot functionality, deliver moderation and automation features, operate tickets and dashboard tools, maintain security, troubleshoot errors, prevent abuse, and improve the service.</p></section>
        <section className="legal-section"><h2>4. Discord Permissions and Data Access</h2><p>KRAXXBot operates through Discord&apos;s APIs and accesses information needed for enabled features and the permissions granted to it in a server. Access is not unrestricted: functionality depends on the bot&apos;s granted Discord permissions and available Discord API data.</p></section>
        <section className="legal-section"><h2>5. Message and User Content</h2><p>KRAXXBot does not maintain a general database of Discord message content. However, its ticket transcript feature fetches up to 100 messages from a ticket channel when a transcript is generated or archived. The generated transcript can include message text, author tags and IDs, and timestamps; it is posted as a file to the relevant server&apos;s ticket-transcript channel, and the database may retain the transcript&apos;s Discord attachment URL.</p><p>Other feature records can include content that administrators or users provide, such as ticket subjects, reasons, staff notes, announcement content, embed data, welcome messages, task descriptions, reminders, meeting agendas, poll questions, and suggestions.</p></section>
        <section className="legal-section"><h2>6. Multi-Server Data Isolation</h2><p>KRAXXBot is designed as a multi-tenant application. Guild-specific configuration and records are associated with the relevant Discord guild, and dashboard access checks are performed in the context of that guild. One server&apos;s configuration is not intended to be available to another server.</p></section>
        <section className="legal-section"><h2>7. Data Retention</h2><p>KRAXXBot retains information for as long as reasonably necessary to provide the relevant feature, maintain security, meet legal obligations, resolve disputes, or support legitimate operational needs. The current implementation does not define universal fixed retention periods for all categories of data.</p></section>
        <section className="legal-section"><h2>8. Data Deletion</h2><p>There is no automated self-service deletion workflow for all KRAXXBot data. To request deletion of applicable data, contact us through the <a href="https://discord.gg/kraxx" target="_blank" rel="noopener noreferrer">KRAXX support server</a> and provide enough information to identify the relevant Discord account or server. We will review requests in light of the data involved and legitimate operational, legal, and security needs.</p></section>
        <section className="legal-section"><h2>9. Security</h2><p>We use reasonable technical and organizational measures appropriate to the service to help protect information. No method of transmission, storage, or operation is completely secure, and we cannot guarantee absolute security.</p></section>
        <section className="legal-section"><h2>10. Third-Party Services</h2><p>KRAXXBot uses Discord and Discord&apos;s APIs to provide its bot and OAuth sign-in functionality. The deployed service uses hosted PostgreSQL storage and web and bot hosting infrastructure. Those services process information as necessary to operate their respective services.</p></section>
        <section className="legal-section"><h2>11. International Processing</h2><p>Information may be processed in locations where Discord and the infrastructure used to operate KRAXXBot provide their services. Those locations may differ from your own. We do not make a representation in this policy about processing in any specific country.</p></section>
        <section className="legal-section"><h2>12. Children&apos;s Privacy</h2><p>KRAXXBot is not directed to children in violation of applicable law. If you believe a child has provided personal information through KRAXXBot, please contact us through the support server so we can review the concern.</p></section>
        <section className="legal-section"><h2>13. Changes to This Policy</h2><p>We may update this Privacy Policy from time to time. The latest version will be posted here with its “Last updated” date.</p></section>
        <section className="legal-section"><h2>14. Contact</h2><p>For privacy questions or requests concerning KRAXXBot, contact us through the <a href="https://discord.gg/kraxx" target="_blank" rel="noopener noreferrer">KRAXX support server</a>.</p></section>
      </main>
      <LegalFooter />
    </div>
  );
}
