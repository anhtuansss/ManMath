'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { IS_GOOGLE_AUTH_CONFIGURED } from '../../config/auth';
import {
  getCurrentUser,
  loginWithGoogleCredential,
  type AuthUser,
} from '../../lib/authApi';
import { clearAuthToken, getAuthToken, setAuthToken } from '../../lib/authStorage';

export function AuthButton() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      return;
    }

    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        setIsLoading(true);
        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
          setErrorMessage(null);
        }
      } catch {
        if (isMounted) {
          clearAuthToken();
          setUser(null);
          setErrorMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;

    if (!credential) {
      setErrorMessage('Đăng nhập thất bại. Vui lòng thử lại.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const loginResult = await loginWithGoogleCredential(credential);
      setAuthToken(loginResult.token);
      setUser(loginResult.user);
    } catch {
      setErrorMessage('Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setErrorMessage(null);
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block min-w-0 text-right">
          <Link href="/profile" className="block truncate text-sm font-semibold text-text-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded max-w-[120px]">
            {user.fullName ?? user.email.split('@')[0]}
          </Link>
        </div>
        <Link href="/profile" className="shrink-0 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              {(user.fullName ?? user.email).charAt(0).toUpperCase()}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          title="Đăng xuất"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-error-light hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {errorMessage && (
        <p className="hidden sm:block max-w-[150px] truncate text-xs font-medium text-error" title={errorMessage}>
          {errorMessage}
        </p>
      )}

      {IS_GOOGLE_AUTH_CONFIGURED ? (
        isLoading ? (
          <div className="h-8 w-[120px] animate-pulse rounded bg-background-alt" />
        ) : (
          <div style={{ colorScheme: 'light' }} className="flex justify-center [&>div]:!h-[36px]">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => setErrorMessage('Đăng nhập thất bại')}
              shape="rectangular"
              size="medium"
              type="standard"
              text="signin"
            />
          </div>
        )
      ) : (
        <span className="text-xs text-text-muted">Chưa cấu hình Google Auth</span>
      )}
    </div>
  );
}
