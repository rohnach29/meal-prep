// API endpoint to send push notifications
// Called by external cron service (runs every minute)
// Checks each user's preferences and sends notifications at their chosen times
// Returns immediately if no users have notifications scheduled for the current minute

import webpush from 'web-push';
import { kv } from '@vercel/kv';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@mealprep.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Get time of day based on current hour
function getTimeOfDay(hour) {
    if (hour >= 5 && hour < 13) {
        return 'morning';
    } else if (hour >= 13 && hour < 17) {
        return 'afternoon';
    } else {
        return 'night';
    }
}

// Get current time in user's timezone as HH:MM
function getCurrentTimeInTimezone(timezone) {
    const now = new Date();
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const hours = String(timeInZone.getHours()).padStart(2, '0');
    const minutes = String(timeInZone.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Check if user should receive notification at current time
function shouldNotifyNow(preferences) {
    if (!preferences || !preferences.times || preferences.times.length === 0) {
        return false;
    }

    const timezone = preferences.timezone || 'America/New_York';
    const currentTime = getCurrentTimeInTimezone(timezone);

    // Check if current time (HH:MM) matches any of the user's preferred times
    return preferences.times.includes(currentTime);
}

export default async function handler(req, res) {
    // Only allow POST requests (from cron) or GET for testing
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check required environment variables
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.error('❌ VAPID keys not configured');
        return res.status(500).json({
            error: 'Server configuration error',
            details: 'VAPID keys not set. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to environment variables.'
        });
    }

    // Verify cron secret for security
    const cronSecret = req.headers['x-cron-secret'] || req.headers['authorization'];
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('❌ Unauthorized cron request');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('🔔 Checking for scheduled notifications...');

        // Get all subscriptions
        let subscriptions;
        try {
            subscriptions = await kv.get('push_subscriptions') || [];
        } catch (kvError) {
            console.error('❌ Vercel KV error:', kvError.message);
            return res.status(500).json({
                error: 'Database connection failed',
                details: 'Vercel KV not configured. Create a KV database in Vercel Dashboard → Storage.',
                kvError: kvError.message
            });
        }
        console.log(`Found ${subscriptions.length} total subscriptions`);

        if (subscriptions.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No subscriptions to notify',
                sent: 0
            });
        }

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;
        const failedEndpoints = [];

        // Check each subscription and send if their notification time matches
        for (const sub of subscriptions) {
            try {
                // Check if this user should be notified now
                if (!shouldNotifyNow(sub.preferences)) {
                    skippedCount++;
                    continue; // Skip this user - not their notification time
                }

                // Get timezone-aware time of day for this user
                const timezone = sub.preferences?.timezone || 'America/New_York';
                const timeInZone = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
                const hour = timeInZone.getHours();
                const timeOfDay = getTimeOfDay(hour);

                // Prepare notification payload
                const notificationPayload = JSON.stringify({
                    title: 'MealPrep Reminder',
                    body: `Time to log your ${timeOfDay} meal!`,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: `meal-reminder-${Date.now()}`,
                    data: {
                        timeOfDay: timeOfDay,
                        url: '/',
                        timestamp: Date.now()
                    }
                });

                // Send notification
                await webpush.sendNotification(sub.subscription, notificationPayload);
                successCount++;
                console.log(`✅ Notification sent (${timeOfDay})`);

            } catch (error) {
                failCount++;
                console.error(`❌ Failed to send notification:`, error.message);

                // If subscription is invalid (410 Gone), mark for removal
                if (error.statusCode === 410 || error.statusCode === 404) {
                    failedEndpoints.push(sub.subscription.endpoint);
                }
            }
        }

        // Remove invalid subscriptions
        if (failedEndpoints.length > 0) {
            const validSubscriptions = subscriptions.filter(
                sub => !failedEndpoints.includes(sub.subscription.endpoint)
            );
            await kv.set('push_subscriptions', validSubscriptions);
            console.log(`Removed ${failedEndpoints.length} invalid subscriptions`);
        }

        console.log(`📊 Results: ${successCount} sent, ${failCount} failed, ${skippedCount} skipped (not their time)`);

        return res.status(200).json({
            success: true,
            message: 'Notifications processed',
            sent: successCount,
            failed: failCount,
            skipped: skippedCount,
            total: subscriptions.length
        });

    } catch (error) {
        console.error('❌ Error sending notifications:', error);
        return res.status(500).json({
            error: 'Failed to send notifications',
            details: error.message
        });
    }
}
