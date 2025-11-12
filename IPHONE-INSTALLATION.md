# Installing MealPrep PWA on iPhone

This guide explains how to install the MealPrep app on your iPhone as a Progressive Web App (PWA).

## Requirements

- iPhone with iOS 16.4 or later
- Safari browser (required for PWA installation on iOS)
- Internet connection

## Important Limitations on iPhone

⚠️ **Before installing, please understand:**

The main feature of this app (clicking action buttons in notifications to instantly log meals) **does NOT work on iPhone**. This is due to Apple's iOS limitations, not the app itself.

**What works on iPhone:**
- ✅ All food and meal tracking features
- ✅ Calorie and macro tracking
- ✅ Creating custom foods and meals
- ✅ Basic notifications (you'll see them)
- ✅ Offline functionality

**What doesn't work on iPhone:**
- ❌ **Notification action buttons** (the main feature)
- ❌ Quick logging from lock screen
- You'll need to open the app to log meals

**Recommendation:** For the full experience, use the app on **macOS with Chrome/Edge** or on **Android**. See [IOS-LIMITATIONS.md](IOS-LIMITATIONS.md) for details.

---

## Installation Steps

### Option 1: Install from Deployed Site (Recommended)

If the app is hosted on a service like Vercel, Netlify, or GitHub Pages:

1. **Open Safari** on your iPhone
   - You must use Safari (Chrome, Edge, Firefox won't work for PWA on iOS)

2. **Navigate to the app URL**
   - Example: `https://your-app-name.vercel.app`

3. **Tap the Share button** (⎙)
   - Located at the bottom of Safari (middle icon)
   - Or at the top right on iPad

4. **Scroll down and tap "Add to Home Screen"**
   - You may need to scroll down in the share menu to find it

5. **Customize the name** (optional)
   - Default: "MealPrep - Smart Nutrition Tracker"
   - You can shorten it to just "MealPrep"

6. **Tap "Add"** in the top right corner

7. **Find the app icon** on your home screen
   - It will appear as a regular app icon
   - Tap it to open the app in standalone mode (no Safari UI)

### Option 2: Install from localhost (Testing Only)

This only works if you're running the app on your Mac and your iPhone is on the same WiFi network:

1. **On your Mac**, find your local IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   - Look for something like `192.168.1.x`

2. **Start the server** on your Mac:
   ```bash
   cd /home/user/meal-prep
   python3 -m http.server 8000
   ```

3. **On your iPhone**, open Safari and go to:
   ```
   http://192.168.1.x:8000
   ```
   - Replace `x` with your actual IP address

4. **Important**: HTTP (non-HTTPS) doesn't support PWA features on iOS, so this method is very limited. You'll see the app but won't get PWA functionality.

**Note:** For testing on iPhone, it's better to deploy to a free hosting service that provides HTTPS.

---

## Deploying to Hosting (For iPhone HTTPS Access)

To use the app properly on iPhone, you need to deploy it to a service with HTTPS:

### Vercel (Easiest - Free)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd /home/user/meal-prep
   vercel deploy
   ```

3. Follow the prompts (first time):
   - Login with GitHub/GitLab/Bitbucket
   - Choose "Yes" to set up and deploy
   - Project name: `meal-prep`
   - Directory: `./` (current directory)

4. You'll get a URL like: `https://meal-prep-xxxxx.vercel.app`

5. Use this URL on your iPhone to install the PWA

### Netlify (Also Easy - Free)

1. Go to [Netlify](https://www.netlify.com/) and sign up

2. **Option A - Drag and Drop:**
   - Drag the `/home/user/meal-prep` folder to Netlify's deploy zone
   - You'll get a URL like: `https://random-name-12345.netlify.app`

3. **Option B - CLI:**
   ```bash
   npm install -g netlify-cli
   cd /home/user/meal-prep
   netlify deploy --prod
   ```

4. Use the provided URL on your iPhone

### GitHub Pages (Free, Requires Git)

1. Create a GitHub repository

2. Push your code:
   ```bash
   cd /home/user/meal-prep
   git remote add origin https://github.com/yourusername/meal-prep.git
   git branch -M main
   git push -u origin main
   ```

3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main, folder: / (root)
   - Save

4. Your app will be at: `https://yourusername.github.io/meal-prep/`

---

## After Installation

### First Launch

1. **Tap the MealPrep icon** on your home screen

2. **Go to Settings tab**
   - Grant notification permissions
   - Set your daily goals (calories, protein, carbs, fat)
   - Customize notification times if desired

3. **Add some foods**
   - Go to Foods tab
   - Browse pre-loaded foods or add custom ones

4. **Create meals** (optional)
   - Go to Meals tab
   - Create meal combinations you eat regularly

5. **Start logging**
   - Use the Dashboard's + button to log foods/meals
   - Track your progress throughout the day

### Enabling Notifications on iPhone

1. In the app, go to **Settings** tab

2. Tap **"Enable Notifications"**

3. When prompted, tap **"Allow"**

4. **Note**: You'll see notifications at your scheduled times (default: 11am, 3pm, 8pm), but they won't have action buttons. You'll need to open the app to log meals.

### Test Mode for iPhone

Even though action buttons don't work, you can still test basic notifications:

1. Go to **Settings** tab
2. Check the **"Test Mode"** checkbox
3. You'll get a notification every minute
4. Tap the notification to open the app
5. **Remember to disable test mode** when done testing

---

## Troubleshooting

### App Won't Install

- **Make sure you're using Safari** (not Chrome or other browsers)
- **Check iOS version**: Must be 16.4 or later
- Settings → General → About → Software Version
- **Clear Safari cache**: Settings → Safari → Clear History and Website Data
- **Try again** after clearing cache

### Notifications Not Working

- **Check permissions**:
  - Settings → Notifications → Safari (or the app name if installed)
  - Make sure "Allow Notifications" is enabled
- **Note**: Notification actions still won't work even with permissions enabled

### App Looks Wrong

- **Hard refresh**:
  - Open in Safari
  - Tap refresh button in address bar
  - Re-add to home screen

### Can't Access from iPhone

If using localhost:
- **Check WiFi**: iPhone and Mac must be on same network
- **Check firewall**: Mac firewall might block connections
- **Better solution**: Deploy to Vercel/Netlify for HTTPS

---

## Removing the App

To uninstall the PWA from your iPhone:

1. **Long press** the MealPrep icon on home screen
2. Tap **"Remove App"**
3. Tap **"Delete App"**
4. Confirm

This won't delete your data in Safari. To clear data:
- Settings → Safari → Advanced → Website Data
- Find your site and swipe to delete

---

## Alternative: Use on Mac Instead

Since the notification action buttons don't work on iPhone, consider using the app primarily on your Mac:

1. **Install on Mac** using Chrome or Edge
2. **Use Mac for scheduled notifications** (11am, 3pm, 8pm)
3. **Get full notification action support** on Mac
4. **Optional**: Install on iPhone for manual logging when away from Mac

See [IOS-LIMITATIONS.md](IOS-LIMITATIONS.md) for detailed explanation of why Mac is better for this app.

---

## Summary

| Feature | iPhone (iOS Safari) | Mac (Chrome/Edge) | Android |
|---------|---------------------|-------------------|---------|
| App Installation | ✅ Yes | ✅ Yes | ✅ Yes |
| Food/Meal Tracking | ✅ Yes | ✅ Yes | ✅ Yes |
| Notifications | ⚠️ Basic only | ✅ Full | ✅ Full |
| Notification Actions | ❌ No | ✅ Yes | ✅ Yes |
| Quick Logging | ❌ No | ✅ Yes | ✅ Yes |
| Offline Support | ✅ Yes | ✅ Yes | ✅ Yes |

**Bottom line:** The app works on iPhone for basic tracking, but you miss the killer feature (notification action buttons). For the full experience, use Mac or Android.

---

## Questions?

- **Notification issues?** See [IOS-LIMITATIONS.md](IOS-LIMITATIONS.md)
- **General help?** See [README.md](README.md)
- **Can't install?** Make sure you're using Safari on iOS 16.4+
