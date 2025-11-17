# MealPrep PWA - Deployment Guide

This guide will help you deploy the MealPrep PWA to Vercel with background push notifications.

## Prerequisites

1. Node.js 18+ installed
2. A Vercel account (free tier works!)
3. npm installed

## Step 1: Install Dependencies

```bash
cd /path/to/meal-prep
npm install
```

## Step 2: Generate VAPID Keys

VAPID keys are required for Web Push notifications.

```bash
npm run generate-vapid
```

This will output:
```
VAPID_PUBLIC_KEY=BDqVc5Y...
VAPID_PRIVATE_KEY=4lH7g3...
VAPID_EMAIL=mailto:your-email@example.com
```

**SAVE THESE KEYS!** You'll need them in the next steps.

## Step 3: Update config.js

Open `config.js` and replace the placeholder with your PUBLIC key:

```javascript
const CONFIG = {
    VAPID_PUBLIC_KEY: 'BDqVc5Y...YOUR_ACTUAL_PUBLIC_KEY...',
    // ...
};
```

**Important:** Only use the PUBLIC key here. Keep the PRIVATE key secret!

## Step 4: Install Vercel CLI

```bash
npm i -g vercel
```

## Step 5: Login to Vercel

```bash
vercel login
```

## Step 6: Set Up Vercel KV (Required for subscriptions)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on "Storage"
3. Create a new KV Database
4. Copy the connection string

## Step 7: Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Link to existing project? **N**
- Project name? **meal-prep**
- Directory? **./**
- Override settings? **N**

## Step 8: Set Environment Variables

In the Vercel dashboard:

1. Go to your project settings
2. Click "Environment Variables"
3. Add these variables:

```
VAPID_PUBLIC_KEY = your_public_key_here
VAPID_PRIVATE_KEY = your_private_key_here
VAPID_EMAIL = mailto:your-email@example.com

# For KV (from Step 6)
KV_REST_API_URL = your_kv_url
KV_REST_API_TOKEN = your_kv_token
KV_REST_API_READ_ONLY_TOKEN = your_kv_read_token
```

## Step 9: Redeploy with Environment Variables

```bash
vercel --prod
```

## Step 10: Test Push Notifications

1. Open your Vercel URL (e.g., `https://meal-prep-xyz.vercel.app`)
2. Go to Settings
3. Click "📡 Subscribe to Push Notifications"
4. Accept the permission prompt
5. You should see "✅ Subscribed"

## How It Works

### Scheduled Notifications

Vercel Cron Jobs trigger at these times (UTC):
- 11:00 AM (EST 6:00 AM or 7:00 AM depending on DST)
- 3:00 PM (EST)
- 8:00 PM (EST)

**Note:** The cron times in `vercel.json` are in UTC. Adjust them for your timezone:

```json
"crons": [
    {
        "path": "/api/send-notifications",
        "schedule": "0 16 * * *"  // 11:00 AM EST (16:00 UTC)
    },
    {
        "path": "/api/send-notifications",
        "schedule": "0 20 * * *"  // 3:00 PM EST (20:00 UTC)
    },
    {
        "path": "/api/send-notifications",
        "schedule": "0 1 * * *"   // 8:00 PM EST (01:00 UTC next day)
    }
]
```

### Architecture

1. **Frontend (PWA)** - Static files served by Vercel
2. **Service Worker** - Handles push events and shows notifications
3. **API Routes** - Vercel serverless functions
   - `/api/subscribe` - Saves push subscriptions to KV store
   - `/api/send-notifications` - Sends push notifications to all subscribers
4. **Vercel KV** - Stores push subscriptions persistently
5. **Vercel Cron** - Triggers notifications at scheduled times

### Testing Push Notifications

To test manually (without waiting for cron):

```bash
curl -X POST https://your-app.vercel.app/api/send-notifications
```

Or visit the URL in your browser.

## Troubleshooting

### "VAPID key not configured"
- Update `config.js` with your public key
- Redeploy

### "Failed to save subscription"
- Check Vercel KV is set up
- Verify environment variables are set

### No notifications received
- Check browser notification permissions
- Verify you're subscribed (Settings → Push status)
- Check Vercel logs for errors

### Cron jobs not running
- Verify `vercel.json` cron schedule
- Check Vercel dashboard for cron execution logs
- Free tier has limited cron invocations

## Limitations

- **Free Tier Limits**: Vercel free tier has limits on cron executions and serverless function invocations
- **iOS Support**: Push notifications work on Android and desktop browsers, but NOT on iOS (Apple limitation)
- **Subscription Expiry**: Push subscriptions can expire; users may need to re-subscribe

## Security

- Never expose your VAPID_PRIVATE_KEY
- The public key is safe to include in client-side code
- Consider adding authentication for `/api/send-notifications` to prevent unauthorized access

## Future Improvements

1. User-specific notification times (stored in KV)
2. Multiple subscription management per user
3. Notification history tracking
4. Custom notification content based on recent meals
5. Rate limiting for API endpoints

---

**Congratulations!** You now have a PWA with true background push notifications! 🎉
