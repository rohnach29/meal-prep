// Debug endpoint to check subscription status
// GET /api/debug-subscriptions
// Use query param ?secret=YOUR_CRON_SECRET for authentication

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // Simple authentication via query param
    const secret = req.query.secret;
    if (!secret || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized - add ?secret=YOUR_CRON_SECRET' });
    }

    try {
        const subscriptions = await kv.get('push_subscriptions') || [];

        // Get current time for reference
        const now = new Date();
        const timezones = ['America/New_York', 'America/Los_Angeles', 'America/Chicago'];
        const currentTimes = {};

        timezones.forEach(tz => {
            const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: tz }));
            const hours = String(timeInZone.getHours()).padStart(2, '0');
            const minutes = String(timeInZone.getMinutes()).padStart(2, '0');
            currentTimes[tz] = `${hours}:${minutes}`;
        });

        // Summarize subscriptions without exposing full keys
        const summary = subscriptions.map((sub, index) => ({
            index: index + 1,
            endpoint: sub.subscription.endpoint.substring(0, 50) + '...',
            preferences: sub.preferences,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt
        }));

        return res.status(200).json({
            success: true,
            totalSubscriptions: subscriptions.length,
            currentTimes: currentTimes,
            subscriptions: summary,
            tips: [
                'To receive a notification NOW, set one of your notification times to the current time in your timezone',
                'Check Vercel logs: vercel logs --follow',
                'Verify cron job is running on cron-job.org',
                'Make sure browser/app is closed when testing'
            ]
        });

    } catch (error) {
        console.error('Error fetching debug info:', error);
        return res.status(500).json({
            error: 'Failed to fetch subscriptions',
            details: error.message
        });
    }
}
