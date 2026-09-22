import type { Metadata } from 'next';
import Link from 'next/link';
import { KRAXXBOT_SUPPORT_SERVER_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing the use of KRAXXBot, a Discord server management and automation platform.',
};

function LegalNavigation() {
  return (
    <nav className="legal-nav" aria-label="Public navigation">
      <div className="legal-nav-inner">
        <Link href="/" className="legal-brand" aria-label="KRAXXBot home">
          <span className="legal-brand-mark" aria-hidden="true">K</span>
          KRAXXBot
        </Link>
        <div className="legal-nav-links">
          <Link href="/privacy" className="legal-link">Privacy Policy</Link>
          <a href={KRAXXBOT_SUPPORT_SERVER_URL} target="_blank" rel="noopener noreferrer" className="legal-link">Support</a>
        </div>
      </div>
    </nav>
  );
}

function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div className="legal-footer-inner">
        <div className="legal-footer-links">
          <Link href="/terms" className="legal-link">Terms of Service</Link>
          <Link href="/privacy" className="legal-link">Privacy Policy</Link>
          <a href={KRAXXBOT_SUPPORT_SERVER_URL} target="_blank" rel="noopener noreferrer" className="legal-link">Support Server</a>
        </div>
        <p className="legal-footer-copy">© {new Date().getFullYear()} KRAXX. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function TermsPage() {
  return (
    <div className="legal-page">
      <LegalNavigation />
      <main className="legal-container legal-article">
        <p className="legal-eyebrow">KRAXXBot Legal</p>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: September 22, 2026</p>
        <p className="legal-intro">These Terms govern your use of KRAXXBot and its web dashboard. Please read them before installing, configuring, or using the service.</p>

        <section className="legal-section"><h2>1. About KRAXXBot</h2><p>KRAXXBot is a Discord application for server management and community operations. Its available features may include moderation, support tickets, automation, role and channel configuration, announcements, reminders, embeds, and related community tools.</p></section>
        <section className="legal-section"><h2>2. Acceptance of Terms</h2><p>By using KRAXXBot, including by installing it in a Discord server or using its dashboard, you agree to these Terms. If you do not agree, do not use KRAXXBot.</p></section>
        <section className="legal-section"><h2>3. Discord Account and Server Authority</h2><p>You must comply with Discord&apos;s terms, policies, and applicable rules when using KRAXXBot. Anyone who installs or configures KRAXXBot for a server must have the authority and Discord permissions necessary to do so for that server.</p></section>
        <section className="legal-section"><h2>4. Acceptable Use</h2><p>You may not use KRAXXBot to:</p><ul><li>break applicable law or violate Discord&apos;s rules;</li><li>abuse, probe, or bypass access controls or authorization checks;</li><li>interfere with the service, Discord APIs, or other users&apos; use of either;</li><li>introduce malware or other malicious activity; or</li><li>use the service in a way that is fraudulent, harmful, or unauthorized.</li></ul></section>
        <section className="legal-section"><h2>5. Server Administration</h2><p>Server administrators are responsible for their server&apos;s configuration and operations, including moderation decisions, roles, permissions, channels, automations, announcements, and content. KRAXXBot provides tools; it does not take responsibility for an administrator&apos;s choices or their effects.</p></section>
        <section className="legal-section"><h2>6. Bot Permissions</h2><p>KRAXXBot needs Discord permissions to provide the functionality a server requests. Administrators should review the permissions presented during installation and configuration, and grant only permissions they understand and consider appropriate for their server.</p></section>
        <section className="legal-section"><h2>7. Dashboard and Discord OAuth</h2><p>The dashboard uses Discord OAuth2 to authenticate a user and identify the Discord servers that user may be able to manage. Signing in does not by itself give a user authority over a server; server access is evaluated in the context of the relevant server.</p></section>
        <section className="legal-section"><h2>8. Server Data and Content</h2><p>KRAXXBot may process information needed to provide enabled features. Server administrators remain responsible for the content they configure, create, submit, or cause KRAXXBot to send or process.</p></section>
        <section className="legal-section"><h2>9. Availability and Changes</h2><p>We may improve, change, suspend, or discontinue features at any time for operational, security, or product reasons. KRAXXBot is provided without a promise of uninterrupted availability or error-free operation.</p></section>
        <section className="legal-section"><h2>10. Third-Party Services</h2><p>KRAXXBot operates with Discord and its APIs. The service also depends on the hosting and database infrastructure used to operate the bot and dashboard. Your use of Discord remains subject to Discord&apos;s own terms and policies.</p></section>
        <section className="legal-section"><h2>11. Intellectual Property</h2><p>KRAXXBot&apos;s software, branding, and original content are protected by applicable intellectual-property laws. Nothing in these Terms transfers ownership of those materials to you. Discord names, marks, and platform materials belong to Discord or their respective owners.</p></section>
        <section className="legal-section"><h2>12. Disclaimer</h2><p>KRAXXBot is provided on an “as is” and “as available” basis. To the extent permitted by law, we disclaim warranties that are not expressly stated in these Terms. This does not limit rights that cannot lawfully be excluded.</p></section>
        <section className="legal-section"><h2>13. Suspension and Termination</h2><p>We may suspend or terminate access to KRAXXBot where reasonably necessary to address abuse, a violation of these Terms or Discord&apos;s rules, a security concern, legal requirements, or other legitimate operational reasons.</p></section>
        <section className="legal-section"><h2>14. Changes to Terms</h2><p>We may update these Terms from time to time. The latest version will be posted here with its “Last updated” date. Continued use after an update means you accept the updated Terms.</p></section>
        <section className="legal-section"><h2>15. Contact</h2><p>For questions about these Terms or KRAXXBot, contact us through the <a href={KRAXXBOT_SUPPORT_SERVER_URL} target="_blank" rel="noopener noreferrer">KRAXX support server</a>.</p></section>
      </main>
      <LegalFooter />
    </div>
  );
}
