import { verifyToken } from '@clerk/backend';

/**
 * Verify a Clerk session token sent by the frontend.
 *
 * Clerk's frontend session and this Express API are separate request
 * boundaries, so the API must verify the bearer token itself before trusting
 * its subject. See:
 * https://clerk.com/docs/backend-requests/handling/nodejs
 */
export const clerkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Clerk authentication required.',
      code: 'CLERK_AUTH_REQUIRED',
    });
  }

  if (!process.env.CLERK_SECRET_KEY) {
    return next(new Error('CLERK_SECRET_KEY is not configured'));
  }

  try {
    const token = authHeader.slice('Bearer '.length);
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!claims.sub) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Clerk token.',
        code: 'CLERK_TOKEN_INVALID',
      });
    }

    req.clerkAuth = {
      userId: claims.sub,
      claims,
    };

    next();
  } catch (error) {
    console.warn(`Clerk authentication failed from ${req.ip}: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired Clerk session.',
      code: 'CLERK_TOKEN_INVALID',
    });
  }
};

export default clerkAuth;