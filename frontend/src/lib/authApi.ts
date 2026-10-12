import { API_BASE_URL } from '../config/api';
import { clearAuthToken, getAuthToken } from './authStorage';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type GoogleLoginResponse = {
  token: string;
  user: AuthUser;
};

export type CurrentUserResponse = {
  user: AuthUser;
};

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data = (await response.json()) as { message?: unknown };

    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
};

export const isUnauthorizedError = (error: unknown): boolean => {
  return error instanceof AuthApiError && error.status === 401;
};

export const fetchProtectedJson = async <T>(path: string): Promise<T> => {
  const token = getAuthToken();

  if (!token) {
    throw new AuthApiError('Unauthorized', 401);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearAuthToken();
    throw new AuthApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response, 'Request failed');
    throw new AuthApiError(message, response.status);
  }

  return response.json() as Promise<T>;
};

export const loginWithGoogleCredential = async (
  credential: string,
): Promise<GoogleLoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, 'Google login failed');
    throw new Error(message);
  }

  return response.json() as Promise<GoogleLoginResponse>;
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  try {
    const data = await fetchProtectedJson<CurrentUserResponse>('/api/auth/me');
    return data.user;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 404) {
      clearAuthToken();
      throw new AuthApiError('Unauthorized', 401);
    }

    throw error;
  }
};
