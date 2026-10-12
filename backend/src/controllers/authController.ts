import type { Request, Response } from 'express';
import {
  getAuthUserById,
  loginWithGoogleCredential,
} from '../services/authService';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const loginWithGoogle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!isPlainObject(req.body)) {
    res.status(400).json({ message: 'Invalid request body' });
    return;
  }

  const { credential } = req.body;

  if (typeof credential !== 'string' || credential.trim().length === 0) {
    res.status(400).json({ message: 'Missing Google credential' });
    return;
  }

  try {
    const result = await loginWithGoogleCredential(credential.trim());

    res.status(200).json(result);
  } catch (error) {
    console.error('Google login failed:', error);
    res.status(401).json({ message: 'Google login failed' });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const user = await getAuthUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Failed to load current user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
