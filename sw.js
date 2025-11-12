// Service Worker for MealPrep PWA
const CACHE_NAME = 'mealprep-v1';
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
        const request = indexedDB.open('MealPrepDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getRecentItems() {
    const db = await openDatabase();
    const transaction = db.transaction(['logs'], 'readonly');
    const store = transaction.objectStore('logs');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev');
        const results = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && results.length < 5) {
                results.push(cursor.value);
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

async function scheduleNextNotifications() {
    const times = ['11:00', '15:00', '20:00']; // 11am, 3pm, 8pm
    const now = new Date();

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
            // Reschedule for next day
            scheduleNextNotifications();
        }, timeUntil);

        notificationSchedule[timeStr] = timeoutId;
    }

    console.log('Notifications scheduled for:', times);
}

async function showMealNotification() {
    try {
        const recentLogs = await getRecentItems();

        if (recentLogs.length === 0) {
            // No recent items, show generic notification
            await self.registration.showNotification('MealPrep Reminder', {
                body: 'Time to log your meal!',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'meal-reminder',
                requireInteraction: true
            });
            return;
        }

        // Get details for recent items
        const recentItems = [];
        for (const log of recentLogs.slice(0, 5)) {
            const item = await getItemDetails(log.type, log.itemId);
            if (item) {
                recentItems.push({
                    id: item.id,
                    name: item.name,
                    type: log.type,
                    calories: log.type === 'food' ? item.calories : item.totalCalories
                });
            }
        }

        // Create notification with actions for each recent item
        const actions = recentItems.map((item, index) => ({
            action: `log-${item.type}-${item.id}`,
            title: `${item.name} (${item.calories} cal)`
        }));

        await self.registration.showNotification('Quick Log Your Meal', {
            body: 'Tap a recent meal to log it quickly:',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'meal-reminder',
            requireInteraction: true,
            actions: actions,
            data: {
                recentItems: recentItems
            }
        });

        console.log('Meal notification shown with actions:', actions);
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

// Handle notification clicks
self.addEventListener('notificationclick', async (event) => {
    event.notification.close();

    const action = event.action;
    const data = event.notification.data;

    if (action && action.startsWith('log-')) {
        // Parse action: log-{type}-{id}
        const parts = action.split('-');
        const itemType = parts[1]; // 'food' or 'meal'
        const itemId = parseInt(parts[2]);

        // Log the item to database
        try {
            const db = await openDatabase();
            const transaction = db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');

            const today = new Date().toISOString().split('T')[0];
            const logData = {
                type: itemType,
                itemId: itemId,
                date: today,
                timestamp: Date.now()
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

            // Show confirmation notification
            await self.registration.showNotification('Logged!', {
                body: 'Meal logged successfully',
                icon: '/icon-192.png',
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
        }
    } else {
        // Open app on notification click
        event.waitUntil(
            clients.openWindow('/')
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
