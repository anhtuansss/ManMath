import { Suspense } from 'react';
import { HistoryClient } from '../../../components/history/HistoryClient';

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryClient />
    </Suspense>
  );
}
