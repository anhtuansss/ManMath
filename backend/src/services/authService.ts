import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID } from '../config/env';
import { signAuthToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export type AuthUserDto = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type GoogleLoginResultDto = {
  token: string;
  user: AuthUserDto;
};

export const loginWithGoogleCredential = async (
  credential: string,
): Promise<GoogleLoginResultDto> => {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google credential payload');
  }

  const googleId = payload.sub;
  const email = payload.email;
  const fullName = payload.name ?? null;
  const avatarUrl = payload.picture ?? null;

  const existingGoogleUser = await prisma.user.findUnique({
    where: {
      googleId,
    },
  });

  const user =
    existingGoogleUser ??
    (await prisma.user.findUnique({
      where: {
        email,
      },
    }));

  const savedUser = user
    ? await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          googleId,
          email,
          fullName,
          avatarUrl,
          authProvider: 'google',
        },
      })
    : await prisma.user.create({
        data: {
          email,
          fullName,
          avatarUrl,
          googleId,
          passwordHash: null,
          authProvider: 'google',
        },
      });

  const token = signAuthToken({
    userId: savedUser.id,
    email: savedUser.email,
  });

  return {
    token,
    user: {
      id: savedUser.id,
      email: savedUser.email,
      fullName: savedUser.fullName,
      avatarUrl: savedUser.avatarUrl,
    },
  };
};

export const getAuthUserById = async (
  userId: string,
): Promise<AuthUserDto | null> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
    },
  });

  return user;
};
