import { redirect } from 'next/navigation';

/**
 * Compatibility route. The workspace now lives at /dashboard.
 */
export default function ExamsPage() {
  redirect('/dashboard');
}
