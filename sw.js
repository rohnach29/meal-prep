// Service Worker for MealPrep PWA
const CACHE_NAME = 'mealprep-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/db.js',
    '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

// IndexedDB helper functions for Service Worker
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MealPrepDB', 2); // Updated to version 2
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Utility: Get time of day category based on hour
// Morning: 5am-1pm, Afternoon: 1pm-5pm, Night: 5pm-5am
function getTimeOfDay(hour = null) {
    if (hour === null) {
        hour = new Date().getHours();
    }

    if (hour >= 5 && hour < 13) {
        return 'morning';
    } else if (hour >= 13 && hour < 17) {
        return 'afternoon';
    } else {
        return 'night';
    }
}

async function getRecentItems() {
    const db = await openDatabase();
    const transaction = db.transaction(['logs'], 'readonly');
    const store = transaction.objectStore('logs');
    const index = store.index('timeOfDay');
    const today = new Date().toISOString().split('T')[0];
    const currentTimeOfDay = getTimeOfDay();

    console.log(`Getting recent items for ${currentTimeOfDay} (excluding today: ${today})`);

    return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(currentTimeOfDay), 'prev');
        const results = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && results.length < 5) {
                const log = cursor.value;
                // Skip today's logs - only show from previous days in this time period
                if (log.date !== today) {
                    results.push(log);
                }
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

async function getItemDetails(type, id) {
    const db = await openDatabase();
    const storeName = type === 'food' ? 'foods' : 'meals';
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Scheduled notifications
let notificationSchedule = {};

async function getNotificationSettings() {
    const db = await openDatabase();
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
        const request = store.get('notifications');
        request.onsuccess = () => {
            const settings = request.result || {
                enabled: false,
                times: ['11:00', '15:00', '20:00'],
                testMode: false
            };
            resolve(settings);
        };
        request.onerror = () => reject(request.error);
    });
}

async function scheduleNextNotifications() {
    // Clear existing schedules
    Object.values(notificationSchedule).forEach(timeoutId => clearTimeout(timeoutId));
    notificationSchedule = {};

    const settings = await getNotificationSettings();

    if (!settings.enabled) {
        console.log('Notifications disabled');
        return;
    }

    const times = settings.times || ['11:00', '15:00', '20:00'];
    const testMode = settings.testMode || false;
    const now = new Date();

    console.log('Scheduling notifications - Test mode:', testMode, 'Times:', times);

    if (testMode) {
        // Test mode: Fire every minute
        console.log('TEST MODE: Notifications will fire every minute');
        const scheduleTestNotification = () => {
            showMealNotification();
            notificationSchedule.testMode = setTimeout(scheduleTestNotification, 60000); // Every 60 seconds
        };
        // Fire first one after 5 seconds
        notificationSchedule.testMode = setTimeout(scheduleTestNotification, 5000);
    } else {
        // Normal mode: Schedule for specific times
        for (const timeStr of times) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const scheduledTime = new Date();
            scheduledTime.setHours(hours, minutes, 0, 0);

            // If time has passed today, schedule for tomorrow
            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            const timeUntil = scheduledTime - now;
            const timeoutId = setTimeout(() => {
                showMealNotification();
                // Reschedule for next occurrence
                scheduleNextNotifications();
            }, timeUntil);

            notificationSchedule[timeStr] = timeoutId;

            // Log when it will fire
            const willFireAt = new Date(now.getTime() + timeUntil);
            console.log(`Notification scheduled for ${timeStr} - will fire at ${willFireAt.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
        }
    }
}

async function showMealNotification() {
    try {
        const recentLogs = await getRecentItems();

        if (recentLogs.length === 0) {
            // No recent items, show generic notification
            await self.registration.showNotification('MealPrep Reminder', {
                body: 'Time to log your meal! Open the app to add foods.',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'meal-reminder',
                requireInteraction: false
            });
            return;
        }

        // Get details for recent items
        const recentItems = [];
        for (const log of recentLogs.slice(0, 5)) {
            const item = await getItemDetails(log.type, log.itemId);
            if (item) {
                const quantity = log.quantity || 1;
                const baseCalories = log.type === 'food' ? item.calories : item.totalCalories;
                const totalCalories = Math.round(baseCalories * quantity);

                recentItems.push({
                    id: item.id,
                    name: item.name,
                    type: log.type,
                    calories: totalCalories,
                    quantity: quantity,
                    serving: log.type === 'food' ? (item.serving || '') : `${item.foods?.length || 0} foods`
                });
            }
        }

        // Send 5 separate notifications - one for each recent item
        // This works on BOTH macOS and iPhone!
        console.log(`Sending ${recentItems.length} separate notifications for quick logging`);

        for (let i = 0; i < recentItems.length; i++) {
            const item = recentItems[i];
            const emoji = item.type === 'food' ? '🍽️' : '🥗';
            const quantityText = item.quantity !== 1 ? ` × ${item.quantity}` : '';

            await self.registration.showNotification(`${emoji} ${item.name}${quantityText}`, {
                body: `${item.calories} cal${item.serving ? ` • ${item.serving}` : ''}\n\nTap to log this ${item.type}!`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `meal-quick-log-${i}`, // Unique tag so all 5 show up
                requireInteraction: false, // Allow auto-dismiss on mobile
                data: {
                    // Store the item info so we can log it on click
                    itemType: item.type,
                    itemId: item.id,
                    itemName: item.name,
                    quantity: item.quantity
                }
            });
        }

        console.log(`Successfully sent ${recentItems.length} meal notifications`);
    } catch (error) {
        console.error('Error showing meal notifications:', error);
    }
}

// Handle notification clicks
self.addEventListener('notificationclick', async (event) => {
    event.notification.close();

    const data = event.notification.data;

    // Check if this is a quick-log notification (has itemType and itemId)
    if (data && data.itemType && data.itemId) {
        // Log the item to database
        event.waitUntil(
            (async () => {
                try {
                    const db = await openDatabase();
                    const transaction = db.transaction(['logs'], 'readwrite');
                    const store = transaction.objectStore('logs');

                    const today = new Date().toISOString().split('T')[0];
                    const timeOfDay = getTimeOfDay();
                    const quantity = data.quantity || 1; // Use quantity from notification, default to 1

                    const logData = {
                        type: data.itemType,
                        itemId: data.itemId,
                        quantity: quantity,
                        date: today,
                        timestamp: Date.now(),
                        timeOfDay: timeOfDay
                    };

                    await new Promise((resolve, reject) => {
                        const request = store.add(logData);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });

                    console.log('Item logged from notification:', logData);

                    // Notify any open clients to refresh
                    const clients = await self.clients.matchAll({ type: 'window' });
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'REFRESH_DASHBOARD'
                        });
                    });

                    // Show confirmation notification with item name and quantity
                    const itemName = data.itemName || (data.itemType === 'food' ? 'Food' : 'Meal');
                    const quantityText = quantity !== 1 ? ` × ${quantity}` : '';
                    await self.registration.showNotification('✅ Logged!', {
                        body: `${itemName}${quantityText} logged successfully`,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        tag: 'log-confirmation',
                        requireInteraction: false
                    });

                    // Close confirmation after 2 seconds
                    setTimeout(async () => {
                        const notifications = await self.registration.getNotifications({ tag: 'log-confirmation' });
                        notifications.forEach(n => n.close());
                    }, 2000);

                } catch (error) {
                    console.error('Error logging item from notification:', error);
                    // Show error notification
                    await self.registration.showNotification('Error', {
                        body: 'Failed to log item. Please try again.',
                        icon: '/icon-192.png',
                        tag: 'log-error',
                        requireInteraction: false
                    });
                }
            })()
        );
    } else {
        // Generic notification click - just open the app
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clients => {
                // Check if app is already open
                if (clients.length > 0) {
                    // Focus the first client
                    return clients[0].focus();
                }
                // Open new window if app not open
                return self.clients.openWindow('/');
            })
        );
    }
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SCHEDULE_NOTIFICATIONS') {
        scheduleNextNotifications();
    } else if (event.data.type === 'SHOW_TEST_NOTIFICATION') {
        showMealNotification();
    }
});

// Start scheduling on service worker activation
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.resolve().then(() => {
            // Schedule notifications after a short delay
            setTimeout(() => {
                scheduleNextNotifications();
            }, 1000);
        })
    );
});

// Listen for dashboard refresh requests
self.addEventListener('message', async (event) => {
    if (event.data.type === 'REFRESH_DASHBOARD') {
        // Broadcast to all clients
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
            client.postMessage({ type: 'REFRESH_DASHBOARD' });
        });
    }
});
