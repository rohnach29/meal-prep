// Configuration for MealPrep PWA
// IMPORTANT: Replace this with your actual VAPID public key after generating it!
// Run: npm run generate-vapid
// Then copy the VAPID_PUBLIC_KEY here

const CONFIG = {
    // VAPID Public Key - Generated via npm run generate-vapid
    // This is safe to expose - it's the public key
    VAPID_PUBLIC_KEY: 'BOs3lEWs9QItcFm8An8jeizAbqn6Etm6WxMh07Rz0ohz-MEBpmbNS8hDya6dmFFaFX7JmE3YpuOzbc5F0ukVPps',

    // API endpoints (will be relative to your Vercel deployment)
    API_SUBSCRIBE: '/api/subscribe',
    API_SEND_NOTIFICATIONS: '/api/send-notifications',

    // Default notification times (EST)
    DEFAULT_NOTIFICATION_TIMES: ['11:00', '15:00', '20:00'],

    // Version for cache busting
    VERSION: '2.0.0',

    // Is this running on production (Vercel)?
    IS_PRODUCTION: window.location.hostname !== 'localhost'
};

// Helper function to convert VAPID key for push subscription
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
