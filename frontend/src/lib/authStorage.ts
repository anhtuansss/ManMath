const AUTH_TOKEN_STORAGE_KEY = 'manmath-auth-token';
export const AUTH_TOKEN_CHANGED_EVENT = 'manmath-auth-token-changed';

const canUseLocalStorage = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

const notifyAuthTokenChanged = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
};

export const getAuthToken = (): string | null => {
  if (!canUseLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

export const setAuthToken = (token: string): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  notifyAuthTokenChanged();
};

export const clearAuthToken = (): void => {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  notifyAuthTokenChanged();
};

export const subscribeAuthTokenChange = (
  callback: () => void,
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, callback);
  };
};
