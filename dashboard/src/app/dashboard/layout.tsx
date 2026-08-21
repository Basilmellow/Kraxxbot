import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Reject users not in the Discord guild
  if (!session.user?.isMember) {
    return (
      <div className="min-h-screen bg-[#05080d] flex items-center justify-center p-4">
        <div className="kraxx-glass rounded-2xl p-8 max-w-md text-center border border-[#ef4444]/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <div className="w-12 h-12 rounded-full bg-[#ef4444]/10 text-[#ef4444] mx-auto flex items-center justify-center mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-[#e2e8f0] mb-2">Access Denied</h2>
          <p className="text-xs text-[#94a3b8] mb-6">
            Your Discord account is not recognized as a member of the <strong className="text-[#e2e8f0]">KRAXX HQ</strong> server. Access to internal operations telemetry is restricted to guild members.
          </p>
          <a
            href="/api/auth/signout"
            className="kraxx-btn kraxx-btn-ghost text-xs w-full py-2.5"
          >
            Disconnect Account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05080d] flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 pb-12">{children}</main>
      </div>
    </div>
  );
}
