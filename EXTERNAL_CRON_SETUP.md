# External Cron Setup for Push Notifications

Since Vercel's free Hobby plan only allows daily cron jobs, we'll use a **free external cron service** to trigger the notification API hourly. The API automatically checks each user's notification preferences and only sends notifications to users whose preferred times match the current hour.

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

5. **Create 1 Hourly Cron Job**

   - Title: `MealPrep Hourly Notification Check`
   - URL: `https://YOUR-APP.vercel.app/api/send-notifications`
   - Schedule: **Hourly** - Every hour at minute 0 (e.g., 1:00, 2:00, 3:00...)
     - Pattern: `0 * * * *` or select "Every 1 hour" in the UI
   - Request Method: `GET`
   - Custom Headers:
     - Header: `x-cron-secret`
     - Value: `YOUR_CRON_SECRET`

   **How it works:**
   - The cron job triggers every hour
   - The API checks all subscribed users
   - For each user, it checks if the current time (in their timezone) matches one of their preferred notification times
   - Only sends notifications to users whose time matches
   - Everyone else is skipped

6. **Test immediately**
   - Click "Execute now" to test
   - Check Vercel logs to see: "X sent, Y failed, Z skipped (not their time)"
   - If you want to test receiving a notification, set one of your notification times to the current hour

---

## Option 2: GitHub Actions (Alternative)

**Pros:** Already integrated with your repo, version controlled
**Cons:** Slightly more setup, may have 5-10 minute delays

### Setup Steps:

1. **Create `.github/workflows/notifications.yml`**

```yaml
name: Hourly Notification Check

on:
  schedule:
    # Run every hour at minute 0 (UTC)
    - cron: '0 * * * *'
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
