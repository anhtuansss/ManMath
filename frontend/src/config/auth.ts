const rawGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

export const GOOGLE_CLIENT_ID =
  rawGoogleClientId && rawGoogleClientId.length > 0 ? rawGoogleClientId : '';

export const IS_GOOGLE_AUTH_CONFIGURED = GOOGLE_CLIENT_ID.length > 0;
