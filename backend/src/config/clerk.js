import { Webhook } from 'svix';

export const verifyClerkWebhook = (payload, headers) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not defined in environment variables');
  }

  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw new Error('Missing required svix headers');
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  try {
    const evt = wh.verify(JSON.stringify(payload), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
    
    console.log('✅ Clerk webhook verified successfully');
    return evt;
  } catch (err) {
    console.error('❌ Clerk webhook verification failed:', err.message);
    throw new Error('Webhook verification failed');
  }
};
