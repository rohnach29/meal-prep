# MealPrep - Complete Nutrition Tracker

A Progressive Web App (PWA) for comprehensive nutrition tracking including macronutrients, micronutrients, vitamins, minerals, and omega fatty acid ratios.

## Features

### USDA Food Database Search
Search the USDA FoodData Central database with detailed nutritional information for thousands of foods. Simply type a food name and get complete macro and micro nutrient data instantly.

### Complete Nutrient Tracking
Track over 30 nutrients organized into categories:

**Macronutrients**
- Calories, Protein, Carbohydrates, Fat
- Fiber, Sugar, Saturated Fat

**Vitamins**
- Vitamin A, C, D, E, K
- B-Vitamins: B1 (Thiamin), B2 (Riboflavin), B3 (Niacin), B5 (Pantothenic Acid), B6, B12, Folate

**Minerals**
- Calcium, Iron, Magnesium, Phosphorus, Potassium
- Sodium, Zinc, Copper, Manganese, Selenium

**Fatty Acids & Omega Ratio**
- Omega-3 (ALA, EPA, DHA)
- Omega-6 (Linoleic Acid)
- Real-time Omega-6:Omega-3 ratio tracking with status indicator

### Personalized Goals
Set up your profile with height, weight, age, sex, and activity level. The app calculates personalized daily goals using the Mifflin-St Jeor equation for BMR/TDEE, plus research-based micronutrient recommendations.

### Smart Notifications
Receive scheduled notifications showing your recently logged foods for quick one-tap logging. Set custom notification times in settings.

### Offline-First PWA
Install as an app on your device. Works completely offline after initial load. All data stored locally on your device.

## Getting Started

### Install
1. Visit the app URL in Chrome, Edge, or Safari
2. Click "Install App" or use browser's install option
3. The app will be added to your home screen

### Set Up Your Profile
1. Go to **Settings** tab
2. Enter your profile information (height, weight, age, sex, activity level)
3. Click **Calculate Goals from Profile**
4. Your personalized macro and micronutrient goals are now set

### Log Foods
1. Tap the **+** button on the dashboard
2. Type a food name to search the USDA database
3. Select a food to see complete nutritional details
4. Tap **Log Food** to add it to your daily intake

### Track Progress
- **Dashboard**: View today's progress for all nutrients
- **Nutrient tabs**: Switch between Macros, Vitamins, Minerals, and Fatty Acids
- **Omega Ratio**: Monitor your omega-6:omega-3 ratio (target: under 4:1)

## Understanding the Omega Ratio

The app tracks your omega-6 to omega-3 ratio, which is important for inflammation and overall health:
- **Excellent (< 2:1)**: Optimal anti-inflammatory balance
- **Good (2:1 - 4:1)**: Healthy range
- **Fair (4:1 - 10:1)**: Could improve
- **Poor (> 10:1)**: Typical Western diet, may promote inflammation

## Data Privacy

All data is stored locally on your device using IndexedDB. No data is sent to any server. Your nutrition information stays completely private.

## Browser Support

| Platform | Browser | Full Support |
|----------|---------|--------------|
| macOS | Chrome/Edge | Yes |
| Windows | Chrome/Edge | Yes |
| Android | Chrome | Yes |
| iOS 16.4+ | Safari | Yes (limited notification actions) |

## Technical Stack

- Vanilla JavaScript (no frameworks)
- IndexedDB for local storage
- Service Workers for offline support
- USDA FoodData Central API for food data

## License

MIT License
