import { verifyClerkWebhook } from '../config/clerk.js';
import User from '../lib/db/models/User.js';

export const handleClerkWebhook = async (req, res, next) => {
  try {
    const payload = JSON.parse(req.body.toString());
    
    // Verify webhook
    const evt = verifyClerkWebhook(payload, req.headers);

    const eventType = evt.type;

    // Handle user.created
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      await User.create({
        _id: id,
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim(),
        roles: ['student'],
        image: image_url,
      });

      console.log(`✅ User ${id} synced to MongoDB`);
    }

    // Handle user.updated
    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      await User.findByIdAndUpdate(id, {
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim(),
        image: image_url,
      });

      console.log(`✅ User ${id} updated in MongoDB`);
    }

    // Handle user.deleted
    if (eventType === 'user.deleted') {
      const { id } = evt.data;

      await User.findByIdAndDelete(id);
      console.log(`✅ User ${id} deleted from MongoDB`);
    }

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    next(error);
  }
};
