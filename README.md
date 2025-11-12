# MealPrep - Smart Nutrition Tracker PWA

A Progressive Web App (PWA) for tracking meals, calories, and nutrition with intelligent scheduled notifications.

> **⚠️ Important for iOS Users:** The main notification feature (action buttons) has **limited support on iPhone**. For the full experience, use **macOS with Chrome/Edge** or **Android**. [Read full iOS limitations →](IOS-LIMITATIONS.md)

## Features

### Core Functionality
- **Food Database**: Pre-loaded with 20 common foods, or add your own custom foods
- **Meal Creation**: Combine multiple foods into reusable meals
- **Calorie Tracking**: Track daily calories and macronutrients (protein, carbs, fat)
- **Goal Setting**: Set and monitor daily nutrition goals
- **Quick Logging**: Fast food/meal logging with search functionality

### Key Feature: Smart Notifications
The app sends notifications at scheduled times (11:00 AM, 3:00 PM, 8:00 PM) showing your 5 most recently logged meals/foods. You can **click action buttons directly in the notification** to instantly log a meal without opening the app!

This makes meal logging incredibly fast and convenient.

## Installation

### Option 1: Local Development
1. Clone this repository
2. Serve the files using any static web server:
   ```bash
   # Using Python
   python3 -m http.server 8000

   # Using Node.js
   npx serve

   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser
4. Click "Install App" when prompted to add to home screen

### Option 2: Deploy to Hosting
Deploy to any static hosting service:
- **Netlify**: Drag and drop the folder
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push to gh-pages branch
- **Firebase Hosting**: `firebase deploy`

## Setup

### 1. Install the PWA
When you first visit the app, you'll see an "Install App" button in the header. Click it to install the PWA to your home screen. This enables offline functionality and notifications.

### 2. Enable Notifications
1. Go to the **Settings** tab
2. Click **Enable Notifications**
3. Grant notification permissions when prompted
4. Notifications will be automatically scheduled for 11:00 AM, 3:00 PM, and 8:00 PM

### 3. Set Your Goals
In the Settings tab, set your daily nutrition goals:
- Calorie goal
- Protein goal (grams)
- Carbs goal (grams)
- Fat goal (grams)

## Usage

### Dashboard
The dashboard shows:
- Current calories vs. goal
- Macro breakdown (protein, carbs, fat)
- Today's logged meals with timestamps
- Quick add button (+) for fast logging

### Foods
- Search through pre-loaded common foods
- Add custom foods with nutritional information
- Delete foods you don't need
- Each food includes: name, serving size, calories, and macros

### Meals
- Create meals from multiple foods
- Save frequently eaten meal combinations
- Automatically calculates total nutrition
- Quickly log entire meals with one click

### Quick Add (+ Button)
Click the floating + button on the dashboard to:
- Search all foods and meals
- Instantly log items with one tap
- Fastest way to log during the day

### Notification-Based Logging
This is the killer feature! At 11 AM, 3 PM, and 8 PM, you'll receive a notification showing your 5 most recently logged items. **Click the action buttons directly in the notification** to log that item instantly without opening the app.

Perfect for when you eat the same meals regularly!

## Icons

The app currently has placeholder icons. To add proper icons:

### Option 1: Use generate-icons.html
1. Open `generate-icons.html` in a web browser
2. It will automatically generate and download:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)

### Option 2: Create Your Own
Create two PNG images:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

Recommended design:
- Background color: #4CAF50 (green)
- Icon: 🥗 emoji or salad bowl graphic
- Leave some padding around edges

After adding icons, update `manifest.json`:
```json
"icons": [
  {
    "src": "/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  }
]
```

## Data Management

### Export Data
Export all your data (foods, meals, logs) as JSON:
1. Go to Settings
2. Click "Export Data"
3. Downloads a JSON file with all your data

### Clear Data
Clear all data to start fresh:
1. Go to Settings
2. Click "Clear All Data"
3. Confirm the action

## Browser Compatibility

### ✅ Full Support (Recommended)
**All features including notification actions:**
- **macOS**: Chrome, Edge, Brave
- **Windows**: Chrome, Edge
- **Android**: Chrome, Edge, Samsung Internet
- **Linux**: Chrome, Edge, Firefox

### ⚠️ Limited Support
**Basic features only, NO notification actions:**
- **iOS 16.4+**: Safari only (all iOS browsers use Safari's engine)
- **macOS Safari**: Limited PWA support

### 📱 Platform Recommendations

| Platform | Browser | Notification Actions | Recommendation |
|----------|---------|---------------------|----------------|
| macOS | Chrome/Edge | ✅ Yes | **Best for full experience** |
| macOS | Safari | ❌ No | Not recommended |
| iPhone/iOS | Safari | ❌ No | Limited - see [iOS Limitations](IOS-LIMITATIONS.md) |
| Android | Chrome/Edge | ✅ Yes | **Full support** |
| Windows | Chrome/Edge | ✅ Yes | **Full support** |

**For iPhone Users:** The notification action buttons (main feature) don't work on iOS. Please read [IOS-LIMITATIONS.md](IOS-LIMITATIONS.md) for detailed explanation and recommended setup.

## Technical Details

### Technology Stack
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Storage**: IndexedDB for local data
- **PWA**: Service Workers for offline + notifications
- **UI**: Custom CSS with responsive design

### File Structure
```
meal-prep/
├── index.html          # Main app UI
├── styles.css          # App styling
├── app.js              # Main app logic
├── db.js               # IndexedDB database layer
├── sw.js               # Service Worker (PWA + notifications)
├── manifest.json       # PWA manifest
├── generate-icons.html # Icon generator utility
└── README.md          # This file
```

### Database Schema
- **foods**: Store food items with nutrition info
- **meals**: Store meal combinations
- **logs**: Track consumed foods/meals by date
- **settings**: User preferences and goals

## Troubleshooting

### Notifications Not Working
1. Check browser supports notifications
2. Verify notification permissions are granted
3. Ensure service worker is registered (check DevTools)
4. Try triggering a test notification from DevTools console:
   ```javascript
   navigator.serviceWorker.controller.postMessage({type: 'SHOW_TEST_NOTIFICATION'})
   ```

### App Not Installing
1. Must be served over HTTPS (or localhost)
2. Must have valid manifest.json
3. Must have registered service worker
4. Try in a different browser

### Data Not Persisting
1. Check IndexedDB is enabled
2. Ensure browser isn't in private/incognito mode
3. Check browser storage quota

### Service Worker Not Updating
1. Close all tabs with the app
2. Clear service worker in DevTools
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## iOS and iPhone Users - READ THIS

**The main notification feature (action buttons for quick logging) does NOT work on iPhone/iOS.**

This is due to Apple's PWA limitations, not the app itself. On iOS you'll get notifications, but you'll need to open the app to log meals - defeating the quick-logging purpose.

### Recommended Setup:
1. **Use on macOS (Mac computer)** with Chrome or Edge - Get full notification action support
2. **Use on Android** - Get full notification action support
3. **Use on iPhone** - Only if you accept limited functionality

For detailed explanation of iOS limitations and recommended setup, see [IOS-LIMITATIONS.md](IOS-LIMITATIONS.md)

## Privacy

All data is stored locally on your device using IndexedDB. No data is sent to any server. The app works completely offline after initial load.

## Future Enhancements

Potential improvements:
- Barcode scanner for food entry
- Photo-based food logging
- Integration with fitness trackers
- Recipe suggestions based on goals
- Social sharing of meals
- Nutrition trends and analytics
- Water intake tracking
- Custom notification times

## Contributing

Feel free to fork and customize for your needs! The code is straightforward vanilla JavaScript.

## License

MIT License - Use freely for personal or commercial projects.

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review browser console for errors
3. Test in a different browser
4. Create an issue with details

---

**Enjoy tracking your nutrition with smart notifications!** 🥗
