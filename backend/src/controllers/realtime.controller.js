import ably from '../config/ably.js';

const realtimeCapability = {
  'shuttle:*': ['subscribe'],
  'stop:*': ['subscribe'],
  'route:*': ['subscribe'],
  global: ['subscribe'],
};

/**
 * Issue a short-lived, subscribe-only Ably token request to an authenticated
 * frontend. The permanent ABLY_API_KEY never leaves this backend.
 * See: https://ably.com/docs/auth/token
 */
export const createRealtimeTokenRequest = async (req, res, next) => {
  try {
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: req.clerkAuth.userId,
      capability: JSON.stringify(realtimeCapability),
      ttl: 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: tokenRequest,
    });
  } catch (error) {
    next(error);
  }
};