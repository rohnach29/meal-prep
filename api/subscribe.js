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
            const { subscription, preferences } = req.body;

            if (!subscription || !subscription.endpoint) {
                return res.status(400).json({ error: 'Invalid subscription' });
            }

            // Get existing subscriptions
            let subscriptions = await kv.get('push_subscriptions') || [];

            // Check if subscription already exists
            const exists = subscriptions.some(sub => sub.subscription.endpoint === subscription.endpoint);

            // Always update preferences even if subscription exists
            const existingIndex = subscriptions.findIndex(sub => sub.subscription.endpoint === subscription.endpoint);

            const subscriptionData = {
                subscription: subscription,
                createdAt: exists ? subscriptions[existingIndex].createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Store user preferences (notification times in HH:MM format, timezone)
                preferences: preferences || {
                    times: ['11:00', '15:00', '20:00'], // Default times
                    timezone: 'America/New_York'
                }
            };

            if (exists) {
                subscriptions[existingIndex] = subscriptionData;
                console.log(`Subscription updated. Total: ${subscriptions.length}`);
            } else {
                subscriptions.push(subscriptionData);
                console.log(`New subscription saved. Total: ${subscriptions.length}`);
            }

            await kv.set('push_subscriptions', subscriptions);

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
