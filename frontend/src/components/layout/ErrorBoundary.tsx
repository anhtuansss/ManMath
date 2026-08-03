'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 text-text-primary">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-error-light">
              <svg
                width="24"
                height="24"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-error"
                aria-hidden="true"
              >
                <path
                  d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm0 7a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM8 4.5a.75.75 0 0 1 .743.648L8.75 5.25v3.5a.75.75 0 0 1-1.493.102L7.25 8.75v-3.5A.75.75 0 0 1 8 4.5Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
              Đã có lỗi xảy ra
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Hệ thống gặp sự cố ngoài dự kiến. Bạn có thể thử tải lại trang hoặc quay về trang chủ.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt"
              >
                Thử lại
              </button>
              <Link
                href="/"
                onClick={this.handleReset}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Quay về trang chủ
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
