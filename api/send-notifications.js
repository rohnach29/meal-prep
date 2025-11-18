// API endpoint to send push notifications
// This is called by Vercel Cron Jobs at scheduled times

import webpush from 'web-push';
import { kv } from '@vercel/kv';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@mealprep.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Get time of day based on current hour in EST
function getTimeOfDay() {
    const now = new Date();
    // Convert to EST
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hour = estTime.getHours();

    if (hour >= 5 && hour < 13) {
        return 'morning';
    } else if (hour >= 13 && hour < 17) {
        return 'afternoon';
    } else {
        return 'night';
    }
}

export default async function handler(req, res) {
    // Only allow POST requests (from cron) or GET for testing
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify cron secret for security
    const cronSecret = req.headers['x-cron-secret'] || req.headers['authorization'];
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('❌ Unauthorized cron request');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('🔔 Sending scheduled push notifications...');

        // Get all subscriptions
        const subscriptions = await kv.get('push_subscriptions') || [];
        console.log(`Found ${subscriptions.length} subscriptions`);

        if (subscriptions.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No subscriptions to notify',
                sent: 0
            });
        }

        const timeOfDay = getTimeOfDay();
        console.log(`Current time period: ${timeOfDay}`);

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

        let successCount = 0;
        let failCount = 0;
        const failedEndpoints = [];

        // Send to all subscriptions
        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(sub.subscription, notificationPayload);
                successCount++;
                console.log(`✅ Notification sent to subscription`);
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

        console.log(`📊 Results: ${successCount} sent, ${failCount} failed`);

        return res.status(200).json({
            success: true,
            message: 'Notifications sent',
            sent: successCount,
            failed: failCount,
            timeOfDay: timeOfDay
        });

    } catch (error) {
        console.error('❌ Error sending notifications:', error);
        return res.status(500).json({
            error: 'Failed to send notifications',
            details: error.message
        });
    }
}
