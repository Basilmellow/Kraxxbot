import { redirect } from 'next/navigation';

export default function LegacySearchPage() {
  redirect('/dashboard/select-server');
}
