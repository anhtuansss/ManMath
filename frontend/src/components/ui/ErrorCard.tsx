import React from 'react';
import { Button } from './Button';

export interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  backHref?: string;
}

export function ErrorCard({
  title = 'Đã có lỗi xảy ra',
  message,
  onRetry,
  retryText = 'Thử lại',
}: ErrorCardProps) {
  return (
    <div className="w-full max-w-md rounded-xl border border-error-border bg-surface p-8 text-center shadow-card animate-fade-in">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-error-light">
        <svg
          width="24"
          height="24"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="text-error"
        >
          <path
            d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm0 7a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM8 4.5a.75.75 0 0 1 .743.648L8.75 5.25v3.5a.75.75 0 0 1-1.493.102L7.25 8.75v-3.5A.75.75 0 0 1 8 4.5Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-error">{message}</p>
      {onRetry && (
        <div className="mt-6 flex justify-center">
          <Button onClick={onRetry} variant="primary" size="md">
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
}
