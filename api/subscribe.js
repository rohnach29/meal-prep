// API endpoint to save push subscriptions
// POST /api/subscribe - saves a new push subscription
// GET /api/subscribe - returns all subscriptions (for cron job)

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        // Save a new subscription
        try {
            const subscription = req.body;

            if (!subscription || !subscription.endpoint) {
                return res.status(400).json({ error: 'Invalid subscription' });
            }

            // Get existing subscriptions
            let subscriptions = await kv.get('push_subscriptions') || [];

            // Check if subscription already exists
            const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);

            if (!exists) {
                subscriptions.push({
                    subscription: subscription,
                    createdAt: new Date().toISOString(),
                    // Store user preferences (notification times, etc.)
                    preferences: req.body.preferences || {
                        times: ['11:00', '15:00', '20:00'],
                        timezone: 'America/New_York'
                    }
                });

                await kv.set('push_subscriptions', subscriptions);
                console.log(`New subscription saved. Total: ${subscriptions.length}`);
            }

            return res.status(200).json({
                success: true,
                message: 'Subscription saved',
                total: subscriptions.length
            });

        } catch (error) {
            console.error('Error saving subscription:', error);
            return res.status(500).json({ error: 'Failed to save subscription' });
        }
    }

    if (req.method === 'GET') {
        // Get all subscriptions (for cron job)
        try {
            const subscriptions = await kv.get('push_subscriptions') || [];
            return res.status(200).json({ subscriptions });
        } catch (error) {
            console.error('Error getting subscriptions:', error);
            return res.status(500).json({ error: 'Failed to get subscriptions' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
