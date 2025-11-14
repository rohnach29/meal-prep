// IndexedDB Database Manager
class MealPrepDB {
    constructor() {
        this.dbName = 'MealPrepDB';
        this.version = 2; // Updated to support timeOfDay field
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
                    // Upgrading from version 1 to 2: add timeOfDay index
                    const logStore = transaction.objectStore('logs');
                    if (!logStore.indexNames.contains('timeOfDay')) {
                        logStore.createIndex('timeOfDay', 'timeOfDay', { unique: false });
                    }
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Initialize default settings and sample data (only on fresh install)
                if (oldVersion === 0) {
                    const settingsStore = transaction.objectStore('settings');
                    settingsStore.put({ key: 'goals', calorieGoal: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 65 });
                    settingsStore.put({ key: 'notifications', enabled: false, times: ['11:00', '15:00', '20:00'] });

                    // Add sample foods for testing
                    const foodStore = transaction.objectStore('foods');
                    const now = Date.now();

                    // Morning foods
                    foodStore.add({ name: 'Scrambled Eggs', serving: '2 eggs', calories: 180, protein: 12, carbs: 2, fat: 14, timestamp: now - 100000 });
                    foodStore.add({ name: 'Oatmeal', serving: '1 cup', calories: 150, protein: 5, carbs: 27, fat: 3, timestamp: now - 99000 });
                    foodStore.add({ name: 'Greek Yogurt', serving: '1 cup', calories: 130, protein: 20, carbs: 9, fat: 0, timestamp: now - 98000 });
                    foodStore.add({ name: 'Whole Wheat Toast', serving: '2 slices', calories: 160, protein: 8, carbs: 28, fat: 2, timestamp: now - 97000 });
                    foodStore.add({ name: 'Banana', serving: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0, timestamp: now - 96000 });

                    // Afternoon foods
                    foodStore.add({ name: 'Grilled Chicken Salad', serving: '1 bowl', calories: 320, protein: 35, carbs: 15, fat: 12, timestamp: now - 95000 });
                    foodStore.add({ name: 'Apple', serving: '1 medium', calories: 95, protein: 0, carbs: 25, fat: 0, timestamp: now - 94000 });
                    foodStore.add({ name: 'Protein Shake', serving: '1 scoop', calories: 120, protein: 24, carbs: 3, fat: 1, timestamp: now - 93000 });
                    foodStore.add({ name: 'Mixed Nuts', serving: '1 oz', calories: 170, protein: 6, carbs: 6, fat: 15, timestamp: now - 92000 });
                    foodStore.add({ name: 'Hummus & Veggies', serving: '1 cup', calories: 140, protein: 5, carbs: 18, fat: 6, timestamp: now - 91000 });

                    // Night foods
                    foodStore.add({ name: 'Grilled Salmon', serving: '6 oz', calories: 350, protein: 40, carbs: 0, fat: 20, timestamp: now - 90000 });
                    foodStore.add({ name: 'Brown Rice', serving: '1 cup', calories: 215, protein: 5, carbs: 45, fat: 2, timestamp: now - 89000 });
                    foodStore.add({ name: 'Steamed Broccoli', serving: '1 cup', calories: 55, protein: 4, carbs: 11, fat: 0, timestamp: now - 88000 });
                    foodStore.add({ name: 'Chicken Breast', serving: '6 oz', calories: 280, protein: 53, carbs: 0, fat: 6, timestamp: now - 87000 });
                    foodStore.add({ name: 'Sweet Potato', serving: '1 medium', calories: 180, protein: 4, carbs: 41, fat: 0, timestamp: now - 86000 });

                    // Add sample logs from yesterday for each time period
                    const logStore = transaction.objectStore('logs');
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    // Morning logs (food IDs 1-5) - logged yesterday morning
                    logStore.add({ type: 'food', itemId: 1, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(8, 0, 0, 0), timeOfDay: 'morning' });
                    logStore.add({ type: 'food', itemId: 2, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(8, 30, 0, 0), timeOfDay: 'morning' });
                    logStore.add({ type: 'food', itemId: 3, quantity: 0.5, date: yesterdayStr, timestamp: yesterday.setHours(9, 0, 0, 0), timeOfDay: 'morning' });
                    logStore.add({ type: 'food', itemId: 4, quantity: 2, date: yesterdayStr, timestamp: yesterday.setHours(10, 0, 0, 0), timeOfDay: 'morning' });
                    logStore.add({ type: 'food', itemId: 5, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(11, 0, 0, 0), timeOfDay: 'morning' });

                    // Afternoon logs (food IDs 6-10) - logged yesterday afternoon
                    logStore.add({ type: 'food', itemId: 6, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(13, 0, 0, 0), timeOfDay: 'afternoon' });
                    logStore.add({ type: 'food', itemId: 7, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(14, 0, 0, 0), timeOfDay: 'afternoon' });
                    logStore.add({ type: 'food', itemId: 8, quantity: 1.5, date: yesterdayStr, timestamp: yesterday.setHours(15, 0, 0, 0), timeOfDay: 'afternoon' });
                    logStore.add({ type: 'food', itemId: 9, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(16, 0, 0, 0), timeOfDay: 'afternoon' });
                    logStore.add({ type: 'food', itemId: 10, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(16, 30, 0, 0), timeOfDay: 'afternoon' });

                    // Night logs (food IDs 11-15) - logged yesterday night
                    logStore.add({ type: 'food', itemId: 11, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(18, 0, 0, 0), timeOfDay: 'night' });
                    logStore.add({ type: 'food', itemId: 12, quantity: 1.5, date: yesterdayStr, timestamp: yesterday.setHours(18, 30, 0, 0), timeOfDay: 'night' });
                    logStore.add({ type: 'food', itemId: 13, quantity: 2, date: yesterdayStr, timestamp: yesterday.setHours(19, 0, 0, 0), timeOfDay: 'night' });
                    logStore.add({ type: 'food', itemId: 14, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(20, 0, 0, 0), timeOfDay: 'night' });
                    logStore.add({ type: 'food', itemId: 15, quantity: 1, date: yesterdayStr, timestamp: yesterday.setHours(21, 0, 0, 0), timeOfDay: 'night' });
                }
            };
        });
    }

    // Foods CRUD
    async addFood(food) {
        const transaction = this.db.transaction(['foods'], 'readwrite');
        const store = transaction.objectStore('foods');
        const foodData = {
            ...food,
            timestamp: Date.now()
        };
        return new Promise((resolve, reject) => {
            const request = store.add(foodData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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
                    ...foodData,
                    id: id // Preserve the ID
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
    // Morning: 5am-1pm, Afternoon: 1pm-5pm, Night: 5pm-5am
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

    // Get recent logs filtered by time of day, excluding today
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
                    // Skip today's logs - we only want previous days
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
                    id: id // Preserve the ID
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

        return {
            foods,
            meals,
            logs,
            goals,
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

    // Clear all data
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

    // Add sample logs for testing time-based notifications
    async addSampleLogsIfNeeded() {
        try {
            console.log('🔍 Checking if sample logs needed...');

            // Check if we have any logs from previous days
            const allLogs = await this.getAllLogs();
            console.log(`Total logs in database: ${allLogs.length}`);

            const today = new Date().toISOString().split('T')[0];
            console.log(`Today's date: ${today}`);

            const previousLogs = allLogs.filter(log => log.date !== today);
            console.log(`Previous day logs found: ${previousLogs.length}`);

            // If we have previous logs, don't add samples
            if (previousLogs.length > 0) {
                console.log('✅ Previous logs exist, skipping sample data');
                return;
            }

            console.log('⚠️ No previous logs found, adding sample data for testing notifications');

            // Get all foods
            const foods = await this.getAllFoods();
            console.log(`Total foods in database: ${foods.length}`);

            if (foods.length < 15) {
                console.error(`❌ Not enough foods to create sample logs (need 15, have ${foods.length})`);
                return;
            }

            await this.forcedAddSampleLogs();

        } catch (error) {
            console.error('❌ Error in addSampleLogsIfNeeded:', error);
        }
    }

    // Force add sample logs (can be called manually)
    async forcedAddSampleLogs() {
        try {
            console.log('💉 FORCE ADDING SAMPLE LOGS...');

            // Add sample logs from yesterday for each time period
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            console.log(`Yesterday's date: ${yesterdayStr}`);

            const sampleLogs = [
                // Morning logs (first 5 foods) - logged yesterday morning
                { type: 'food', itemId: 1, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(8, 0, 0, 0), timeOfDay: 'morning' },
                { type: 'food', itemId: 2, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(8, 30, 0, 0), timeOfDay: 'morning' },
                { type: 'food', itemId: 3, quantity: 0.5, date: yesterdayStr, timestamp: new Date(yesterday).setHours(9, 0, 0, 0), timeOfDay: 'morning' },
                { type: 'food', itemId: 4, quantity: 2, date: yesterdayStr, timestamp: new Date(yesterday).setHours(10, 0, 0, 0), timeOfDay: 'morning' },
                { type: 'food', itemId: 5, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(11, 0, 0, 0), timeOfDay: 'morning' },

                // Afternoon logs (foods 6-10) - logged yesterday afternoon
                { type: 'food', itemId: 6, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(13, 0, 0, 0), timeOfDay: 'afternoon' },
                { type: 'food', itemId: 7, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(14, 0, 0, 0), timeOfDay: 'afternoon' },
                { type: 'food', itemId: 8, quantity: 1.5, date: yesterdayStr, timestamp: new Date(yesterday).setHours(15, 0, 0, 0), timeOfDay: 'afternoon' },
                { type: 'food', itemId: 9, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(16, 0, 0, 0), timeOfDay: 'afternoon' },
                { type: 'food', itemId: 10, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(16, 30, 0, 0), timeOfDay: 'afternoon' },

                // Night logs (foods 11-15) - logged yesterday night
                { type: 'food', itemId: 11, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(18, 0, 0, 0), timeOfDay: 'night' },
                { type: 'food', itemId: 12, quantity: 1.5, date: yesterdayStr, timestamp: new Date(yesterday).setHours(18, 30, 0, 0), timeOfDay: 'night' },
                { type: 'food', itemId: 13, quantity: 2, date: yesterdayStr, timestamp: new Date(yesterday).setHours(19, 0, 0, 0), timeOfDay: 'night' },
                { type: 'food', itemId: 14, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(20, 0, 0, 0), timeOfDay: 'night' },
                { type: 'food', itemId: 15, quantity: 1, date: yesterdayStr, timestamp: new Date(yesterday).setHours(21, 0, 0, 0), timeOfDay: 'night' }
            ];

            console.log(`Prepared ${sampleLogs.length} sample logs`);

            // Add logs directly to database
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');

            let successCount = 0;
            let errorCount = 0;

            for (const log of sampleLogs) {
                try {
                    await new Promise((resolve, reject) => {
                        const request = store.add(log);
                        request.onsuccess = () => {
                            successCount++;
                            console.log(`  ✅ Added log ${successCount}: ${log.timeOfDay} - food ${log.itemId} × ${log.quantity}`);
                            resolve();
                        };
                        request.onerror = () => {
                            errorCount++;
                            console.error(`  ❌ Failed to add log: food ${log.itemId}`, request.error);
                            reject(request.error);
                        };
                    });
                } catch (error) {
                    console.error(`  ❌ Error adding log:`, error);
                    errorCount++;
                }
            }

            console.log(`✅ Sample logs added! Success: ${successCount}, Errors: ${errorCount}`);
            return { success: successCount, errors: errorCount };

        } catch (error) {
            console.error('❌ CRITICAL ERROR in forcedAddSampleLogs:', error);
            throw error;
        }
    }
}

// Initialize database
const db = new MealPrepDB();
