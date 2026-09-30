import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { requireKraxxBotOwner } from './owner-auth';

export async function requireOwnerPage() {
  const access = await requireKraxxBotOwner();
  if (access.authorized) return;
  if (access.status === 401) redirect('/login');
  notFound();
}
