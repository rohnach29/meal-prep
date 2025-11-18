# External Cron Setup for Push Notifications

Since Vercel's free Hobby plan only allows daily cron jobs, we'll use a **free external cron service** to trigger the notification API every minute. The API automatically checks each user's notification preferences and only sends notifications to users whose preferred times match the current time (down to the minute).

**Why every minute?**
- Exact timing - notifications sent at precisely the user's chosen time (e.g., 3:15 PM, not "between 3-4 PM")
- Lightweight - API returns immediately if no users need notifications at that minute
- Well within free tier limits (see details below)

## Option 1: cron-job.org (Recommended - Easiest)

**Free tier:** Unlimited jobs, runs every minute to daily

### Setup Steps:

1. **Deploy your app to Vercel first**
   ```bash
   vercel --prod
   ```
   Note your production URL (e.g., `https://meal-prep.vercel.app`)

2. **Generate a CRON_SECRET**
   ```bash
   # Generate a random secret
   openssl rand -hex 32
   ```
   Copy this value.

3. **Add CRON_SECRET to Vercel**
   - Go to your Vercel dashboard → Settings → Environment Variables
   - Add: `CRON_SECRET` = your generated secret
   - Redeploy: `vercel --prod`

4. **Sign up at [cron-job.org](https://cron-job.org)**
   - Free account, no credit card required

5. **Create 1 Per-Minute Cron Job**

   - Title: `MealPrep Notification Check`
   - URL: `https://YOUR-APP.vercel.app/api/send-notifications`
   - Schedule: **Every minute**
     - Pattern: `* * * * *` or select "Every 1 minute" in the UI
   - Request Method: `GET`
   - Custom Headers:
     - Header: `x-cron-secret`
     - Value: `YOUR_CRON_SECRET`

   **How it works:**
   - The cron job triggers every minute (e.g., 3:00 PM, 3:01 PM, 3:02 PM...)
   - The API checks all subscribed users
   - For each user, it checks if the current time (in their timezone) matches one of their preferred notification times
   - Only sends notifications to users whose time matches
   - Everyone else is skipped (returns in <10ms)

   **Free tier limits:**
   - cron-job.org: ✅ Unlimited executions, supports per-minute jobs
   - Vercel execution: ✅ 1,440 calls/day = ~43,200/month (well within 100GB-hours limit)
   - Vercel KV reads: ✅ ~43,200 reads/month (free tier is 100,000/month)

6. **Test immediately**
   - Click "Execute now" to test
   - Check Vercel logs to see: "X sent, Y failed, Z skipped (not their time)"
   - To test receiving a notification, set one of your notification times to the current time (e.g., if it's 2:47 PM, set a time to 14:47)

---

## Option 2: GitHub Actions (NOT Recommended for Per-Minute)

**⚠️ Important:** GitHub Actions free tier only provides 2,000 minutes/month. Running every minute would use 43,800 minutes/month, exceeding the limit.

**If you still want to use GitHub Actions** (with reduced accuracy):

You can run every 5 or 10 minutes instead:

### Setup Steps:

1. **Create `.github/workflows/notifications.yml`**

```yaml
name: Notification Check (Every 5 Minutes)

on:
  schedule:
    # Run every 5 minutes (uses ~8,640 minutes/month - exceeds free tier but works for testing)
    - cron: '*/5 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  check-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger notification API
        run: |
          curl -X GET \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            https://YOUR-APP.vercel.app/api/send-notifications
```

**Note:** Even every 5 minutes exceeds the free tier. Stick with cron-job.org for per-minute execution.

2. **Add GitHub Secret**
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CRON_SECRET`
   - Value: Your generated secret (same one in Vercel)

3. **Push the workflow file**
   ```bash
   git add .github/workflows/notifications.yml
   git commit -m "feat: Add GitHub Actions cron for notifications"
   git push
   ```

4. **Test manually**
   - Go to Actions tab → "Send Meal Notifications" → "Run workflow"

---

## Why Per-Minute is Safe on Free Tiers

**Resource Usage (per month):**
- API executions: 43,200 (1,440/day × 30 days)
- Vercel KV reads: 43,200 (one per execution)
- Average execution time: <10ms when no notifications to send

**Free Tier Limits:**
- Vercel Functions: 100 GB-hours/month → We use ~0.12 GB-hours/month (✅ 0.12% of limit)
- Vercel KV: 100,000 requests/month → We use ~43,200/month (✅ 43% of limit)
- cron-job.org: Unlimited executions on free tier (✅ No limit)

**Why it's efficient:**
- 99%+ of API calls return immediately (no users to notify at that minute)
- Only users with matching notification times get processed
- Invalid subscriptions auto-removed (410/404 errors)

---

## Verification

After setup, verify it's working:

1. **Check Vercel Logs**
   ```bash
   vercel logs --follow
   ```
   You should see:
   ```
   🔔 Sending scheduled push notifications...
   Found X subscriptions
   ✅ Notification sent to subscription
   ```

2. **Check your device**
   - You should receive push notifications at the scheduled times
   - Even when browser/app is completely closed

3. **Test manually**
   ```bash
   curl -X GET \
     -H "x-cron-secret: YOUR_SECRET" \
     https://YOUR-APP.vercel.app/api/send-notifications
   ```

---

## Troubleshooting

**Notifications not received:**
- Check you've subscribed to push notifications in the app
- Verify VAPID keys are set in Vercel environment variables
- Check Vercel logs for errors
- Ensure CRON_SECRET matches in both Vercel and cron service

**401 Unauthorized errors:**
- CRON_SECRET doesn't match
- Check header name is exactly `x-cron-secret` (lowercase)

**Cron jobs not running:**
- Check timezone settings in cron-job.org
- GitHub Actions may have 5-10 min delay (normal)
- Verify cron schedule syntax

---

## Cost: $0/month

Both options are completely free and will work indefinitely on free tiers.
