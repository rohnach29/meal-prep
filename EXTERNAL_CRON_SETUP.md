# External Cron Setup for Push Notifications

Since Vercel's free Hobby plan only allows daily cron jobs, we'll use a **free external cron service** to trigger notifications 3 times per day.

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

5. **Create 3 Cron Jobs**

   **Job 1 - Morning (11:00 AM EST)**
   - Title: `MealPrep Morning Notification`
   - URL: `https://YOUR-APP.vercel.app/api/send-notifications`
   - Schedule: Daily at `11:00 AM` in timezone `America/New_York`
   - Request Method: `GET`
   - Custom Headers:
     - Header: `x-cron-secret`
     - Value: `YOUR_CRON_SECRET`

   **Job 2 - Afternoon (3:00 PM EST)**
   - Title: `MealPrep Afternoon Notification`
   - URL: `https://YOUR-APP.vercel.app/api/send-notifications`
   - Schedule: Daily at `3:00 PM` in timezone `America/New_York`
   - Request Method: `GET`
   - Custom Headers:
     - Header: `x-cron-secret`
     - Value: `YOUR_CRON_SECRET`

   **Job 3 - Night (8:00 PM EST)**
   - Title: `MealPrep Night Notification`
   - URL: `https://YOUR-APP.vercel.app/api/send-notifications`
   - Schedule: Daily at `8:00 PM` in timezone `America/New_York`
   - Request Method: `GET`
   - Custom Headers:
     - Header: `x-cron-secret`
     - Value: `YOUR_CRON_SECRET`

6. **Test immediately**
   - Click "Execute now" on each job to test
   - Check Vercel logs to confirm notifications were sent

---

## Option 2: GitHub Actions (Alternative)

**Pros:** Already integrated with your repo, version controlled
**Cons:** Slightly more setup, may have 5-10 minute delays

### Setup Steps:

1. **Create `.github/workflows/notifications.yml`**

```yaml
name: Send Meal Notifications

on:
  schedule:
    # 11:00 AM EST = 16:00 UTC
    - cron: '0 16 * * *'
    # 3:00 PM EST = 20:00 UTC
    - cron: '0 20 * * *'
    # 8:00 PM EST = 01:00 UTC (next day)
    - cron: '0 1 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send notification request
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
