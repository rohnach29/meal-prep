// IndexedDB Database Manager
class MealPrepDB {
    constructor() {
        this.dbName = 'MealPrepDB';
        this.version = 3; // Updated to support micronutrients and profile
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const transaction = event.target.transaction;

                // Foods store
                if (!db.objectStoreNames.contains('foods')) {
                    const foodStore = db.createObjectStore('foods', { keyPath: 'id', autoIncrement: true });
                    foodStore.createIndex('name', 'name', { unique: false });
                    foodStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Meals store
                if (!db.objectStoreNames.contains('meals')) {
                    const mealStore = db.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
                    mealStore.createIndex('name', 'name', { unique: false });
                    mealStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Food logs store (tracks when foods/meals are consumed)
                if (!db.objectStoreNames.contains('logs')) {
                    const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    logStore.createIndex('date', 'date', { unique: false });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logStore.createIndex('type', 'type', { unique: false });
                    logStore.createIndex('timeOfDay', 'timeOfDay', { unique: false });
                } else if (oldVersion < 2) {
                    const logStore = transaction.objectStore('logs');
                    if (!logStore.indexNames.contains('timeOfDay')) {
                        logStore.createIndex('timeOfDay', 'timeOfDay', { unique: false });
                    }
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Initialize default settings (only on fresh install or upgrade to v3)
                if (oldVersion === 0) {
                    this.initializeDefaultData(transaction);
                } else if (oldVersion < 3) {
                    // Upgrade existing settings with new defaults
                    this.upgradeToV3(transaction);
                }
            };
        });
    }

    initializeDefaultData(transaction) {
        const settingsStore = transaction.objectStore('settings');

        // Default goals with micronutrients
        settingsStore.put(this.getDefaultGoals());

        // Default profile
        settingsStore.put(this.getDefaultProfile());

        // Default notifications
        settingsStore.put({ key: 'notifications', enabled: false, times: ['11:00', '15:00', '20:00'] });

        // Add sample foods with micronutrients
        const foodStore = transaction.objectStore('foods');
        const now = Date.now();

        const sampleFoods = this.getSampleFoodsWithMicronutrients();
        sampleFoods.forEach((food, index) => {
            foodStore.add({ ...food, timestamp: now - (100000 - index * 1000) });
        });

        // Add sample logs
        const logStore = transaction.objectStore('logs');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Morning logs
        for (let i = 1; i <= 5; i++) {
            logStore.add({ type: 'food', itemId: i, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(7 + i, 0, 0, 0), timeOfDay: 'morning' });
        }
        // Afternoon logs
        for (let i = 6; i <= 10; i++) {
            logStore.add({ type: 'food', itemId: i, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(12 + (i - 5), 0, 0, 0), timeOfDay: 'afternoon' });
        }
        // Night logs
        for (let i = 11; i <= 15; i++) {
            logStore.add({ type: 'food', itemId: i, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(17 + (i - 10), 0, 0, 0), timeOfDay: 'night' });
        }
    }

    upgradeToV3(transaction) {
        const settingsStore = transaction.objectStore('settings');

        // Add profile if not exists
        settingsStore.put(this.getDefaultProfile());

        // Update goals with micronutrients (will merge with existing)
        const goalsRequest = settingsStore.get('goals');
        goalsRequest.onsuccess = () => {
            const existingGoals = goalsRequest.result || {};
            const defaultGoals = this.getDefaultGoals();
            settingsStore.put({ ...defaultGoals, ...existingGoals, key: 'goals' });
        };
    }

    getDefaultProfile() {
        return {
            key: 'profile',
            height: 170, // cm
            weight: 70, // kg
            age: 30,
            sex: 'male',
            activityLevel: 'moderate' // sedentary, light, moderate, active, veryActive
        };
    }

    getDefaultGoals() {
        return {
            key: 'goals',
            // Macros
            calorieGoal: 2000,
            proteinGoal: 150,
            carbsGoal: 200,
            fatGoal: 65,
            fiberGoal: 30,
            sugarGoal: 50,

            // Fatty acids
            omega3Goal: 1.6, // grams (EPA + DHA + ALA)
            omega6Goal: 11, // grams
            saturatedFatGoal: 20, // grams

            // Minerals (mg unless noted)
            calciumGoal: 1000,
            ironGoal: 8,
            magnesiumGoal: 400,
            phosphorusGoal: 700,
            potassiumGoal: 3500,
            sodiumGoal: 2300,
            zincGoal: 11,
            copperGoal: 0.9,
            manganeseGoal: 2.3,
            seleniumGoal: 55, // mcg

            // Vitamins
            vitaminAGoal: 900, // mcg RAE
            vitaminCGoal: 90, // mg
            vitaminDGoal: 20, // mcg (800 IU)
            vitaminEGoal: 15, // mg
            vitaminKGoal: 120, // mcg
            vitaminB1Goal: 1.2, // mg (Thiamin)
            vitaminB2Goal: 1.3, // mg (Riboflavin)
            vitaminB3Goal: 16, // mg (Niacin)
            vitaminB5Goal: 5, // mg (Pantothenic acid)
            vitaminB6Goal: 1.3, // mg
            vitaminB7Goal: 30, // mcg (Biotin)
            vitaminB9Goal: 400, // mcg (Folate)
            vitaminB12Goal: 2.4, // mcg
            cholineGoal: 550 // mg
        };
    }

    getSampleFoodsWithMicronutrients() {
        return [
            // Morning foods
            {
                name: 'Scrambled Eggs',
                serving: '2 large eggs',
                calories: 180, protein: 12, carbs: 2, fat: 14, fiber: 0, sugar: 1,
                omega3: 0.1, omega6: 1.2, saturatedFat: 4,
                calcium: 56, iron: 1.8, magnesium: 12, phosphorus: 196, potassium: 138,
                sodium: 142, zinc: 1.3, copper: 0.1, manganese: 0.03, selenium: 30,
                vitaminA: 160, vitaminC: 0, vitaminD: 2, vitaminE: 1.1, vitaminK: 0.5,
                vitaminB1: 0.04, vitaminB2: 0.46, vitaminB3: 0.08, vitaminB5: 1.4, vitaminB6: 0.17,
                vitaminB7: 10, vitaminB9: 47, vitaminB12: 1.1, choline: 294
            },
            {
                name: 'Oatmeal',
                serving: '1 cup cooked',
                calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, sugar: 1,
                omega3: 0.04, omega6: 1.0, saturatedFat: 0.5,
                calcium: 21, iron: 2.1, magnesium: 56, phosphorus: 180, potassium: 164,
                sodium: 2, zinc: 2.3, copper: 0.2, manganese: 1.4, selenium: 13,
                vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0.1, vitaminK: 0,
                vitaminB1: 0.26, vitaminB2: 0.05, vitaminB3: 0.9, vitaminB5: 0.4, vitaminB6: 0.06,
                vitaminB7: 2.8, vitaminB9: 14, vitaminB12: 0, choline: 9
            },
            {
                name: 'Greek Yogurt',
                serving: '1 cup (245g)',
                calories: 130, protein: 20, carbs: 9, fat: 0, fiber: 0, sugar: 7,
                omega3: 0, omega6: 0, saturatedFat: 0,
                calcium: 200, iron: 0.1, magnesium: 19, phosphorus: 230, potassium: 240,
                sodium: 65, zinc: 1.0, copper: 0.03, manganese: 0.01, selenium: 10,
                vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                vitaminB1: 0.08, vitaminB2: 0.35, vitaminB3: 0.3, vitaminB5: 0.8, vitaminB6: 0.1,
                vitaminB7: 5, vitaminB9: 18, vitaminB12: 1.3, choline: 27
            },
            {
                name: 'Whole Wheat Toast',
                serving: '2 slices',
                calories: 160, protein: 8, carbs: 28, fat: 2, fiber: 4, sugar: 4,
                omega3: 0.03, omega6: 0.8, saturatedFat: 0.4,
                calcium: 60, iron: 2.0, magnesium: 46, phosphorus: 134, potassium: 138,
                sodium: 264, zinc: 1.1, copper: 0.2, manganese: 1.5, selenium: 22,
                vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0.4, vitaminK: 1,
                vitaminB1: 0.2, vitaminB2: 0.1, vitaminB3: 2.4, vitaminB5: 0.4, vitaminB6: 0.1,
                vitaminB7: 6, vitaminB9: 40, vitaminB12: 0, choline: 15
            },
            {
                name: 'Banana',
                serving: '1 medium (118g)',
                calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3, sugar: 14,
                omega3: 0.03, omega6: 0.05, saturatedFat: 0.1,
                calcium: 6, iron: 0.3, magnesium: 32, phosphorus: 26, potassium: 422,
                sodium: 1, zinc: 0.2, copper: 0.1, manganese: 0.3, selenium: 1,
                vitaminA: 4, vitaminC: 10, vitaminD: 0, vitaminE: 0.1, vitaminK: 0.6,
                vitaminB1: 0.04, vitaminB2: 0.09, vitaminB3: 0.8, vitaminB5: 0.4, vitaminB6: 0.43,
                vitaminB7: 3, vitaminB9: 24, vitaminB12: 0, choline: 12
            },

            // Afternoon foods
            {
                name: 'Grilled Chicken Salad',
                serving: '1 bowl (300g)',
                calories: 320, protein: 35, carbs: 15, fat: 12, fiber: 5, sugar: 4,
                omega3: 0.1, omega6: 2.5, saturatedFat: 2,
                calcium: 80, iron: 2.5, magnesium: 45, phosphorus: 280, potassium: 520,
                sodium: 380, zinc: 2.8, copper: 0.2, manganese: 0.5, selenium: 35,
                vitaminA: 450, vitaminC: 25, vitaminD: 0.1, vitaminE: 2.5, vitaminK: 85,
                vitaminB1: 0.12, vitaminB2: 0.18, vitaminB3: 10, vitaminB5: 1.2, vitaminB6: 0.6,
                vitaminB7: 3, vitaminB9: 80, vitaminB12: 0.4, choline: 95
            },
            {
                name: 'Apple',
                serving: '1 medium (182g)',
                calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4, sugar: 19,
                omega3: 0.01, omega6: 0.05, saturatedFat: 0,
                calcium: 11, iron: 0.2, magnesium: 9, phosphorus: 20, potassium: 195,
                sodium: 2, zinc: 0.1, copper: 0.05, manganese: 0.06, selenium: 0,
                vitaminA: 5, vitaminC: 8, vitaminD: 0, vitaminE: 0.3, vitaminK: 4,
                vitaminB1: 0.03, vitaminB2: 0.05, vitaminB3: 0.2, vitaminB5: 0.1, vitaminB6: 0.07,
                vitaminB7: 0.5, vitaminB9: 5, vitaminB12: 0, choline: 6
            },
            {
                name: 'Protein Shake',
                serving: '1 scoop with water',
                calories: 120, protein: 24, carbs: 3, fat: 1, fiber: 0, sugar: 1,
                omega3: 0, omega6: 0.2, saturatedFat: 0.5,
                calcium: 150, iron: 1.8, magnesium: 60, phosphorus: 150, potassium: 200,
                sodium: 130, zinc: 3.0, copper: 0.3, manganese: 0.5, selenium: 10,
                vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                vitaminB1: 0.3, vitaminB2: 0.3, vitaminB3: 4, vitaminB5: 1.0, vitaminB6: 0.3,
                vitaminB7: 5, vitaminB9: 50, vitaminB12: 1.0, choline: 20
            },
            {
                name: 'Mixed Nuts',
                serving: '1 oz (28g)',
                calories: 170, protein: 6, carbs: 6, fat: 15, fiber: 2, sugar: 1,
                omega3: 0.3, omega6: 5.0, saturatedFat: 1.5,
                calcium: 30, iron: 1.0, magnesium: 64, phosphorus: 140, potassium: 180,
                sodium: 3, zinc: 1.3, copper: 0.4, manganese: 0.7, selenium: 3,
                vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 7.0, vitaminK: 0,
                vitaminB1: 0.12, vitaminB2: 0.1, vitaminB3: 1.3, vitaminB5: 0.3, vitaminB6: 0.1,
                vitaminB7: 6, vitaminB9: 20, vitaminB12: 0, choline: 15
            },
            {
                name: 'Hummus & Veggies',
                serving: '1 cup (245g)',
                calories: 140, protein: 5, carbs: 18, fat: 6, fiber: 5, sugar: 3,
                omega3: 0.1, omega6: 2.0, saturatedFat: 0.8,
                calcium: 45, iron: 1.8, magnesium: 35, phosphorus: 110, potassium: 280,
                sodium: 320, zinc: 1.2, copper: 0.3, manganese: 0.6, selenium: 5,
                vitaminA: 180, vitaminC: 12, vitaminD: 0, vitaminE: 0.8, vitaminK: 25,
                vitaminB1: 0.1, vitaminB2: 0.08, vitaminB3: 0.6, vitaminB5: 0.3, vitaminB6: 0.3,
                vitaminB7: 2, vitaminB9: 80, vitaminB12: 0, choline: 28
            },

            // Night foods
            {
                name: 'Grilled Salmon',
                serving: '6 oz (170g)',
                calories: 350, protein: 40, carbs: 0, fat: 20, fiber: 0, sugar: 0,
                omega3: 3.6, omega6: 0.5, saturatedFat: 4,
                calcium: 18, iron: 1.0, magnesium: 45, phosphorus: 380, potassium: 620,
                sodium: 75, zinc: 0.9, copper: 0.1, manganese: 0.03, selenium: 58,
                vitaminA: 15, vitaminC: 0, vitaminD: 15, vitaminE: 3.5, vitaminK: 0.5,
                vitaminB1: 0.3, vitaminB2: 0.2, vitaminB3: 13, vitaminB5: 1.8, vitaminB6: 1.0,
                vitaminB7: 7, vitaminB9: 35, vitaminB12: 5.0, choline: 130
            },
            {
                name: 'Brown Rice',
                serving: '1 cup cooked (195g)',
                calories: 215, protein: 5, carbs: 45, fat: 2, fiber: 4, sugar: 0,
                omega3: 0.02, omega6: 0.6, saturatedFat: 0.4,
                calcium: 20, iron: 1.0, magnesium: 84, phosphorus: 162, potassium: 154,
                sodium: 10, zinc: 1.2, copper: 0.2, manganese: 1.8, selenium: 19,
                vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0.1, vitaminK: 0,
                vitaminB1: 0.2, vitaminB2: 0.02, vitaminB3: 2.6, vitaminB5: 0.6, vitaminB6: 0.3,
                vitaminB7: 6, vitaminB9: 8, vitaminB12: 0, choline: 19
            },
            {
                name: 'Steamed Broccoli',
                serving: '1 cup (156g)',
                calories: 55, protein: 4, carbs: 11, fat: 0, fiber: 5, sugar: 2,
                omega3: 0.1, omega6: 0.05, saturatedFat: 0.1,
                calcium: 62, iron: 1.0, magnesium: 33, phosphorus: 105, potassium: 457,
                sodium: 64, zinc: 0.6, copper: 0.1, manganese: 0.3, selenium: 2.5,
                vitaminA: 60, vitaminC: 101, vitaminD: 0, vitaminE: 1.5, vitaminK: 220,
                vitaminB1: 0.09, vitaminB2: 0.18, vitaminB3: 0.9, vitaminB5: 0.9, vitaminB6: 0.25,
                vitaminB7: 0.4, vitaminB9: 168, vitaminB12: 0, choline: 63
            },
            {
                name: 'Chicken Breast',
                serving: '6 oz (170g)',
                calories: 280, protein: 53, carbs: 0, fat: 6, fiber: 0, sugar: 0,
                omega3: 0.1, omega6: 1.0, saturatedFat: 1.5,
                calcium: 15, iron: 1.2, magnesium: 43, phosphorus: 360, potassium: 500,
                sodium: 120, zinc: 1.5, copper: 0.08, manganese: 0.03, selenium: 38,
                vitaminA: 10, vitaminC: 0, vitaminD: 0.2, vitaminE: 0.4, vitaminK: 0,
                vitaminB1: 0.1, vitaminB2: 0.15, vitaminB3: 16, vitaminB5: 1.5, vitaminB6: 0.9,
                vitaminB7: 2, vitaminB9: 6, vitaminB12: 0.5, choline: 120
            },
            {
                name: 'Sweet Potato',
                serving: '1 medium (150g)',
                calories: 180, protein: 4, carbs: 41, fat: 0, fiber: 6, sugar: 8,
                omega3: 0.01, omega6: 0.02, saturatedFat: 0,
                calcium: 54, iron: 1.0, magnesium: 38, phosphorus: 80, potassium: 542,
                sodium: 55, zinc: 0.5, copper: 0.26, manganese: 0.76, selenium: 0.3,
                vitaminA: 1096, vitaminC: 30, vitaminD: 0, vitaminE: 1.0, vitaminK: 3,
                vitaminB1: 0.13, vitaminB2: 0.1, vitaminB3: 2.2, vitaminB5: 1.0, vitaminB6: 0.36,
                vitaminB7: 4.6, vitaminB9: 18, vitaminB12: 0, choline: 20
            }
        ];
    }

    // Calculate default goals based on profile
    calculateGoalsFromProfile(profile) {
        const { height, weight, age, sex, activityLevel } = profile;

        // Mifflin-St Jeor equation for BMR
        let bmr;
        if (sex === 'male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }

        // Activity multipliers
        const activityMultipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            veryActive: 1.9
        };

        const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));

        // Macro calculations
        const proteinGoal = Math.round(weight * 2.2); // 2.2g per kg bodyweight
        const fatGoal = Math.round((tdee * 0.25) / 9); // 25% of calories from fat
        const carbsGoal = Math.round((tdee - (proteinGoal * 4) - (fatGoal * 9)) / 4);

        // Micronutrient adjustments based on sex
        const goals = this.getDefaultGoals();
        goals.calorieGoal = tdee;
        goals.proteinGoal = proteinGoal;
        goals.carbsGoal = carbsGoal;
        goals.fatGoal = fatGoal;

        // Adjust for sex differences
        if (sex === 'female') {
            goals.ironGoal = 18; // Higher for women
            goals.calciumGoal = 1000;
            goals.omega3Goal = 1.1;
        }

        // Adjust for age
        if (age > 50) {
            goals.vitaminDGoal = 25; // Higher D for older adults
            goals.vitaminB12Goal = 2.8;
            if (sex === 'female') {
                goals.calciumGoal = 1200;
            }
        }

        return goals;
    }

    // Foods CRUD
    async addFood(food) {
        const transaction = this.db.transaction(['foods'], 'readwrite');
        const store = transaction.objectStore('foods');
        const foodData = {
            ...this.normalizeFood(food),
            timestamp: Date.now()
        };
        return new Promise((resolve, reject) => {
            const request = store.add(foodData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    normalizeFood(food) {
        // Ensure all nutrient fields have default values
        return {
            name: food.name || 'Unknown',
            serving: food.serving || '1 serving',
            // Macros
            calories: food.calories || 0,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fat: food.fat || 0,
            fiber: food.fiber || 0,
            sugar: food.sugar || 0,
            // Fatty acids
            omega3: food.omega3 || 0,
            omega6: food.omega6 || 0,
            saturatedFat: food.saturatedFat || 0,
            // Minerals
            calcium: food.calcium || 0,
            iron: food.iron || 0,
            magnesium: food.magnesium || 0,
            phosphorus: food.phosphorus || 0,
            potassium: food.potassium || 0,
            sodium: food.sodium || 0,
            zinc: food.zinc || 0,
            copper: food.copper || 0,
            manganese: food.manganese || 0,
            selenium: food.selenium || 0,
            // Vitamins
            vitaminA: food.vitaminA || 0,
            vitaminC: food.vitaminC || 0,
            vitaminD: food.vitaminD || 0,
            vitaminE: food.vitaminE || 0,
            vitaminK: food.vitaminK || 0,
            vitaminB1: food.vitaminB1 || 0,
            vitaminB2: food.vitaminB2 || 0,
            vitaminB3: food.vitaminB3 || 0,
            vitaminB5: food.vitaminB5 || 0,
            vitaminB6: food.vitaminB6 || 0,
            vitaminB7: food.vitaminB7 || 0,
            vitaminB9: food.vitaminB9 || 0,
            vitaminB12: food.vitaminB12 || 0,
            choline: food.choline || 0,
            // Source tracking
            fdcId: food.fdcId || null, // USDA FoodData Central ID
            source: food.source || 'manual'
        };
    }

    async getAllFoods() {
        const transaction = this.db.transaction(['foods'], 'readonly');
        const store = transaction.objectStore('foods');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchFoods(query) {
        const foods = await this.getAllFoods();
        const lowerQuery = query.toLowerCase();
        return foods.filter(food =>
            food.name.toLowerCase().includes(lowerQuery)
        );
    }

    async deleteFood(id) {
        const transaction = this.db.transaction(['foods'], 'readwrite');
        const store = transaction.objectStore('foods');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async updateFood(id, foodData) {
        const transaction = this.db.transaction(['foods'], 'readwrite');
        const store = transaction.objectStore('foods');
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const existingFood = getRequest.result;
                const updatedFood = {
                    ...existingFood,
                    ...this.normalizeFood(foodData),
                    id: id
                };
                const putRequest = store.put(updatedFood);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getFood(id) {
        const transaction = this.db.transaction(['foods'], 'readonly');
        const store = transaction.objectStore('foods');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Meals CRUD
    async addMeal(meal) {
        const transaction = this.db.transaction(['meals'], 'readwrite');
        const store = transaction.objectStore('meals');
        const mealData = {
            ...meal,
            timestamp: Date.now()
        };
        return new Promise((resolve, reject) => {
            const request = store.add(mealData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllMeals() {
        const transaction = this.db.transaction(['meals'], 'readonly');
        const store = transaction.objectStore('meals');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchMeals(query) {
        const meals = await this.getAllMeals();
        const lowerQuery = query.toLowerCase();
        return meals.filter(meal =>
            meal.name.toLowerCase().includes(lowerQuery)
        );
    }

    async deleteMeal(id) {
        const transaction = this.db.transaction(['meals'], 'readwrite');
        const store = transaction.objectStore('meals');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getMeal(id) {
        const transaction = this.db.transaction(['meals'], 'readonly');
        const store = transaction.objectStore('meals');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Utility: Get time of day category based on hour
    getTimeOfDay(hour = null) {
        if (hour === null) {
            hour = new Date().getHours();
        }
        if (hour >= 5 && hour < 13) {
            return 'morning';
        } else if (hour >= 13 && hour < 17) {
            return 'afternoon';
        } else {
            return 'night';
        }
    }

    // Logs CRUD
    async addLog(log) {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const today = new Date().toISOString().split('T')[0];
        const timeOfDay = this.getTimeOfDay();
        const logData = {
            ...log,
            date: today,
            timestamp: Date.now(),
            timeOfDay: timeOfDay
        };
        return new Promise((resolve, reject) => {
            const request = store.add(logData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getTodayLogs() {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('date');
        const today = new Date().toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            const request = index.getAll(today);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentLogs(limit = 5) {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentLogsByTimeOfDay(timeOfDay, limit = 5) {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('timeOfDay');
        const today = new Date().toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only(timeOfDay), 'prev');
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    const log = cursor.value;
                    if (log.date !== today) {
                        results.push(log);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteLog(id) {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async updateLog(id, logData) {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const existingLog = getRequest.result;
                const updatedLog = {
                    ...existingLog,
                    ...logData,
                    id: id
                };
                const putRequest = store.put(updatedLog);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getLog(id) {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Settings
    async getSetting(key) {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateSetting(key, data) {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = store.put({ key, ...data });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Data export
    async exportData() {
        const foods = await this.getAllFoods();
        const meals = await this.getAllMeals();
        const logs = await this.getAllLogs();
        const goals = await this.getSetting('goals');
        const profile = await this.getSetting('profile');

        return {
            foods,
            meals,
            logs,
            goals,
            profile,
            exportDate: new Date().toISOString()
        };
    }

    async getAllLogs() {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllData() {
        const stores = ['foods', 'meals', 'logs'];
        const transaction = this.db.transaction(stores, 'readwrite');

        const promises = stores.map(storeName => {
            return new Promise((resolve, reject) => {
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        return Promise.all(promises);
    }

    async addSampleLogsIfNeeded() {
        try {
            const allLogs = await this.getAllLogs();
            const today = new Date().toISOString().split('T')[0];
            const previousLogs = allLogs.filter(log => log.date !== today);

            if (previousLogs.length > 0) {
                return;
            }

            await this.forcedAddSampleLogs();
        } catch (error) {
            console.error('Error in addSampleLogsIfNeeded:', error);
        }
    }

    async forcedAddSampleLogs() {
        try {
            const foods = await this.getAllFoods();
            if (foods.length < 15) {
                console.error('Not enough foods to create sample logs');
                return { success: 0, errors: 0 };
            }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const sampleLogs = [];
            for (let i = 1; i <= 5; i++) {
                sampleLogs.push({ type: 'food', itemId: i, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(7 + i, 0, 0, 0), timeOfDay: 'morning' });
            }
            for (let i = 6; i <= 10; i++) {
                sampleLogs.push({ type: 'food', itemId: i, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(12 + (i - 5), 0, 0, 0), timeOfDay: 'afternoon' });
            }
            for (let i = 11; i <= 15; i++) {
                sampleLogs.push({ type: 'food', itemId: i, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(17 + (i - 10), 0, 0, 0), timeOfDay: 'night' });
            }

            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            let successCount = 0;

            for (const log of sampleLogs) {
                await new Promise((resolve, reject) => {
                    const request = store.add(log);
                    request.onsuccess = () => { successCount++; resolve(); };
                    request.onerror = () => reject(request.error);
                });
            }

            return { success: successCount, errors: 0 };
        } catch (error) {
            console.error('Error in forcedAddSampleLogs:', error);
            throw error;
        }
    }
}

// Initialize database
const db = new MealPrepDB();
