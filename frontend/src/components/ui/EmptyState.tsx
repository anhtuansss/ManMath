import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="w-full max-w-xl animate-fade-in rounded-xl border border-border bg-surface p-8 text-center shadow-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-light text-primary">
        {icon || (
          <span className="text-2xl font-bold">M</span>
        )}
      </div>

      <h1 className="mt-5 font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-text-primary">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        {description}
      </p>

      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
