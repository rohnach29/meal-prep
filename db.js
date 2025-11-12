// IndexedDB Database Manager
class MealPrepDB {
    constructor() {
        this.dbName = 'MealPrepDB';
        this.version = 1;
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
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Initialize default settings
                const transaction = event.target.transaction;
                const settingsStore = transaction.objectStore('settings');
                settingsStore.put({ key: 'goals', calorieGoal: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 65 });
                settingsStore.put({ key: 'notifications', enabled: false, times: ['11:00', '15:00', '20:00'] });
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

    // Logs CRUD
    async addLog(log) {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const today = new Date().toISOString().split('T')[0];
        const logData = {
            ...log,
            date: today,
            timestamp: Date.now()
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

    async deleteLog(id) {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
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
}

// Initialize database
const db = new MealPrepDB();
