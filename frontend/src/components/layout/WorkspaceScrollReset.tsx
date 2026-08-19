'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The workspace layout persists across route changes, so scroll ownership stays
 * on the document. Reset ordinary navigation before paint, while preserving the
 * browser's native restoration for Back and Forward navigation.
 */
export function WorkspaceScrollReset() {
  const pathname = usePathname();
  const isInitialRender = useRef(true);
  const isHistoryNavigation = useRef(false);

  useEffect(() => {
    const markHistoryNavigation = () => {
      isHistoryNavigation.current = true;
    };

    window.addEventListener('popstate', markHistoryNavigation);
    return () => window.removeEventListener('popstate', markHistoryNavigation);
  }, []);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (isHistoryNavigation.current) {
      isHistoryNavigation.current = false;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  return null;
}
