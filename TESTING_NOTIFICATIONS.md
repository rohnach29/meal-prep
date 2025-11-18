# Testing Push Notifications - Complete Guide

This guide shows you how to verify that push notifications are working, even when the browser/app is closed.

## Prerequisites

Before testing, ensure:
1. ✅ App deployed to Vercel
2. ✅ Environment variables set (VAPID keys, CRON_SECRET, KV credentials)
3. ✅ Cron job configured on cron-job.org (runs every minute)
4. ✅ Subscribed to push notifications in the app

---

## Step 1: Verify Subscription

### In the App:
1. Open your app: `https://your-app.vercel.app`
2. Go to Settings tab
3. Set your notification times (e.g., 14:30, 18:00, 20:00)
4. Click "📡 Subscribe to Push Notifications"
5. Grant permission when prompted

### Check Browser Console:
You should see:
```
📡 Subscribing to push notifications...
Service worker ready
User timezone: America/New_York
Notification times: 14:30, 18:00, 20:00
Subscription saved to server: {success: true, ...}
✅ Subscribed
```

---

## Step 2: Check Subscription in Database

### Option A: Debug Endpoint (Easiest)

After redeploying, visit:
```
https://your-app.vercel.app/api/debug-subscriptions?secret=YOUR_CRON_SECRET
```

Replace `YOUR_CRON_SECRET` with your actual secret from Vercel env vars.

You'll see:
```json
{
  "success": true,
  "totalSubscriptions": 1,
  "currentTimes": {
    "America/New_York": "14:47",
    "America/Los_Angeles": "11:47",
    "America/Chicago": "13:47"
  },
  "subscriptions": [
    {
      "index": 1,
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "preferences": {
        "times": ["14:30", "18:00", "20:00"],
        "timezone": "America/New_York"
      },
      "createdAt": "2025-01-15T19:47:23.456Z"
    }
  ]
}
```

### Option B: Vercel Dashboard

1. Go to Vercel Dashboard
2. Storage → Your KV instance
3. Browse keys → Find `push_subscriptions`
4. You should see your subscription data

---

## Step 3: Test Sending a Notification

### Method 1: Set Time to NOW (Recommended)

**This is the easiest way to test:**

1. Check the current time in your timezone (e.g., 2:47 PM = 14:47)
2. In the app settings, set one notification time to the current minute (14:47)
3. Click "📡 Subscribe to Push Notifications" to update
4. Wait for the next minute (the cron job runs every minute)
5. **Close the browser completely** (or close the app tab)
6. You should receive a notification within 1 minute

**Important:** The notification will only come when:
- The cron job triggers (every minute at :00 seconds)
- Your local time matches one of your set times
- So if it's 14:47:30, you'll get the notification at 14:48:00

### Method 2: Manual API Test

Manually trigger the notification API:

```bash
curl -X GET \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/send-notifications
```

Expected response:
```json
{
  "success": true,
  "message": "Notifications processed",
  "sent": 1,        // Number of notifications sent
  "failed": 0,      // Number that failed
  "skipped": 0,     // Number skipped (wrong time)
  "total": 1        // Total subscriptions
}
```

**If `sent: 0` and `skipped: 1`**, it means your current time doesn't match any of your notification times.

---

## Step 4: Check Vercel Logs

Real-time logs show exactly what's happening:

```bash
vercel logs --follow
```

### What to Look For:

**When cron triggers (every minute):**
```
🔔 Checking for scheduled notifications...
Found 1 total subscriptions
```

**When time matches:**
```
✅ Notification sent (morning)
📊 Results: 1 sent, 0 failed, 0 skipped (not their time)
```

**When time doesn't match:**
```
📊 Results: 0 sent, 0 failed, 1 skipped (not their time)
```

**If error:**
```
❌ Failed to send notification: <error message>
```

---

## Step 5: Verify Cron Job is Running

### On cron-job.org:

1. Log into [cron-job.org](https://cron-job.org)
2. Go to your job: "MealPrep Notification Check"
3. Check "Last Execution" - should be within the last minute
4. Check "Status" - should be green/successful
5. Click "History" to see past executions

### Manual Test:
Click "Execute now" button to trigger immediately.

---

## Step 6: Test When App is CLOSED

**This is the key test for background notifications:**

1. Set notification time to current time + 2 minutes (e.g., if it's 2:45, set to 14:47)
2. Subscribe/update preferences
3. **Close the browser completely** (⌘+Q on Mac, Alt+F4 on Windows)
   - Or close the app tab entirely
   - Don't just minimize - actually quit
4. Wait for the scheduled time
5. You should see a system notification appear

**On iOS:**
1. Add PWA to Home Screen (Share → Add to Home Screen)
2. Open the PWA, set notification time, subscribe
3. Close the PWA completely (swipe up from app switcher)
4. Lock your phone
5. Wait for notification time
6. Notification should appear even when app is closed

---

## Troubleshooting

### "0 sent, 1 skipped" in logs
**Cause:** Current time doesn't match any notification times
**Fix:** Set one notification time to the current minute

### "Unauthorized" error in logs
**Cause:** Cron secret mismatch
**Fix:** Verify cron-job.org header `x-cron-secret` matches Vercel `CRON_SECRET` env var

### No notifications received
**Possible causes:**
1. ❌ Browser/app still open → Close it completely
2. ❌ Notification permission denied → Check browser settings
3. ❌ Wrong timezone → Check debug endpoint shows your correct timezone
4. ❌ Cron not running → Check cron-job.org execution history
5. ❌ Time doesn't match → Use debug endpoint to see current time

### Check notification permission:
```javascript
// In browser console:
console.log('Permission:', Notification.permission);
// Should be: "granted"
```

### Re-grant notification permission:
1. Chrome: Site Settings → Notifications → Allow
2. Safari: Preferences → Websites → Notifications → Allow
3. Firefox: Settings → Permissions → Notifications → Allow

---

## Expected Behavior

**Correct Flow:**

1. **Every Minute:** Cron job triggers `/api/send-notifications`
2. **API checks:** All subscriptions to see if current time matches
3. **If match:** Sends push notification via Web Push API
4. **Browser/Device:** Receives notification (even if closed) and displays it
5. **Logs:** Show "X sent, Y failed, Z skipped"

**Timeline Example:**

- 2:46:45 PM - You set notification time to 14:47
- 2:47:00 PM - Cron triggers, API checks, time matches, sends notification
- 2:47:01 PM - Your device receives notification (even if browser closed)
- 2:47:30 PM - You click notification, app opens

---

## Quick Verification Checklist

Use this to verify everything is working:

```
□ App deployed to Vercel
□ Environment variables set (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET, KV credentials)
□ Subscribed to notifications in app
□ Debug endpoint shows subscription: /api/debug-subscriptions?secret=XXX
□ Cron job running on cron-job.org (check Last Execution)
□ Vercel logs show cron triggers every minute
□ Set notification time to current time + 1 minute
□ Close browser/app completely
□ Wait for notification time
□ Notification appears!
```

---

## Need More Help?

1. **Check Vercel logs:** `vercel logs --follow`
2. **Check debug endpoint:** `/api/debug-subscriptions?secret=XXX`
3. **Check cron-job.org:** Execution history
4. **Browser console:** Look for errors when subscribing
5. **Notification permission:** Make sure it's "granted"

The most common issue is testing with the wrong time - use the debug endpoint to see the current time in your timezone and set a notification for the next minute!
