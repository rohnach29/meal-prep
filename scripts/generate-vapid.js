// Run this script ONCE to generate your VAPID keys
// Then add them to your Vercel environment variables

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== VAPID KEYS GENERATED ===');
console.log('\nAdd these to your Vercel Environment Variables:\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('\nVAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\nVAPID_EMAIL=mailto:your-email@example.com');
console.log('\n============================');
console.log('\nIMPORTANT: Keep VAPID_PRIVATE_KEY secret!');
console.log('The VAPID_PUBLIC_KEY will be used in your frontend code.');
