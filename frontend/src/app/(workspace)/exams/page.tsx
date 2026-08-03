import { redirect } from 'next/navigation';

/**
 * Legacy compatibility route. The workspace now lives at /dashboard.
 */
export default function ExamsPage() {
  redirect('/dashboard');
}
