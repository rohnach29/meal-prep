// Main App Logic
class MealPrepApp {
    constructor() {
        this.currentView = 'dashboard';
        this.selectedFoodsForMeal = [];
        this.commonFoods = this.getCommonFoods();
    }

    async init() {
        await db.init();
        await this.initializeCommonFoods();
        this.setupEventListeners();
        this.setupModals();
        this.registerServiceWorker();
        this.setupPWAInstall();
        await this.updateDashboard();
        await this.updateNotificationStatus();
    }

    // Common foods database (fallback if no API)
    getCommonFoods() {
        return [
            { name: 'Chicken Breast', serving: '100g', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            { name: 'Brown Rice', serving: '1 cup cooked', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
            { name: 'Broccoli', serving: '1 cup', calories: 55, protein: 4, carbs: 11, fat: 0.6 },
            { name: 'Salmon', serving: '100g', calories: 208, protein: 20, carbs: 0, fat: 13 },
            { name: 'Eggs', serving: '1 large', calories: 78, protein: 6, carbs: 0.6, fat: 5 },
            { name: 'Oatmeal', serving: '1 cup cooked', calories: 166, protein: 6, carbs: 28, fat: 3.6 },
            { name: 'Banana', serving: '1 medium', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
            { name: 'Greek Yogurt', serving: '1 cup', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
            { name: 'Almonds', serving: '1 oz', calories: 164, protein: 6, carbs: 6, fat: 14 },
            { name: 'Sweet Potato', serving: '1 medium', calories: 103, protein: 2.3, carbs: 24, fat: 0.2 },
            { name: 'Avocado', serving: '1/2 fruit', calories: 161, protein: 2, carbs: 8.6, fat: 15 },
            { name: 'Spinach', serving: '1 cup raw', calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1 },
            { name: 'Tuna', serving: '100g', calories: 132, protein: 28, carbs: 0, fat: 1.3 },
            { name: 'Whole Wheat Bread', serving: '1 slice', calories: 81, protein: 4, carbs: 14, fat: 1.1 },
            { name: 'Peanut Butter', serving: '2 tbsp', calories: 188, protein: 8, carbs: 7, fat: 16 },
            { name: 'Apple', serving: '1 medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
            { name: 'Milk', serving: '1 cup', calories: 149, protein: 8, carbs: 12, fat: 8 },
            { name: 'Cottage Cheese', serving: '1 cup', calories: 163, protein: 28, carbs: 6, fat: 2.3 },
            { name: 'Turkey Breast', serving: '100g', calories: 135, protein: 30, carbs: 0, fat: 0.7 },
            { name: 'Quinoa', serving: '1 cup cooked', calories: 222, protein: 8, carbs: 39, fat: 3.6 }
        ];
    }

    async initializeCommonFoods() {
        const existingFoods = await db.getAllFoods();
        if (existingFoods.length === 0) {
            for (const food of this.commonFoods) {
                await db.addFood(food);
            }
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.view));
        });

        // Dashboard
        document.getElementById('quick-add-btn').addEventListener('click', () => this.openQuickAdd());

        // Foods
        document.getElementById('food-search').addEventListener('input', (e) => this.searchFoods(e.target.value));
        document.getElementById('add-custom-food-btn').addEventListener('click', () => this.openCustomFoodModal());

        // Meals
        document.getElementById('create-meal-btn').addEventListener('click', () => this.openCreateMealModal());

        // Settings
        document.getElementById('save-goals-btn').addEventListener('click', () => this.saveGoals());
        document.getElementById('enable-notifications-btn').addEventListener('click', () => this.enableNotifications());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('clear-data-btn').addEventListener('click', () => this.clearData());

        // Forms
        document.getElementById('custom-food-form').addEventListener('submit', (e) => this.addCustomFood(e));
        document.getElementById('create-meal-form').addEventListener('submit', (e) => this.createMeal(e));
        document.getElementById('meal-food-search').addEventListener('input', (e) => this.searchFoodsForMeal(e.target.value));

        // Quick search
        document.getElementById('quick-search').addEventListener('input', (e) => this.quickSearch(e.target.value));
    }

    setupModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            closeBtn.addEventListener('click', () => modal.classList.remove('active'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

        document.getElementById(`${view}-view`).classList.add('active');
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        if (view === 'foods') this.loadFoods();
        if (view === 'meals') this.loadMeals();
        if (view === 'settings') this.loadSettings();
        if (view === 'dashboard') this.updateDashboard();
    }

    // Dashboard
    async updateDashboard() {
        const logs = await db.getTodayLogs();
        const goals = await db.getSetting('goals');

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        // Calculate totals from logs
        for (const log of logs) {
            if (log.type === 'food') {
                const food = await db.getFood(log.itemId);
                if (food) {
                    totalCalories += food.calories || 0;
                    totalProtein += food.protein || 0;
                    totalCarbs += food.carbs || 0;
                    totalFat += food.fat || 0;
                }
            } else if (log.type === 'meal') {
                const meal = await db.getMeal(log.itemId);
                if (meal) {
                    totalCalories += meal.totalCalories || 0;
                    totalProtein += meal.totalProtein || 0;
                    totalCarbs += meal.totalCarbs || 0;
                    totalFat += meal.totalFat || 0;
                }
            }
        }

        // Update UI
        document.querySelector('.current-calories').textContent = Math.round(totalCalories);
        document.querySelector('.goal-calories').textContent = `/ ${goals.calorieGoal} cal`;

        const macroValues = document.querySelectorAll('.macro-value');
        macroValues[0].textContent = `${Math.round(totalProtein)}g`;
        macroValues[1].textContent = `${Math.round(totalCarbs)}g`;
        macroValues[2].textContent = `${Math.round(totalFat)}g`;

        // Update today's meals list
        await this.updateTodayMealsList(logs);
    }

    async updateTodayMealsList(logs) {
        const container = document.getElementById('today-meals-list');

        if (logs.length === 0) {
            container.innerHTML = '<p class="empty-state">No meals logged yet today</p>';
            return;
        }

        container.innerHTML = '';
        for (const log of logs) {
            let item;
            let name;
            let details;

            if (log.type === 'food') {
                item = await db.getFood(log.itemId);
                name = item?.name || 'Unknown Food';
                details = `${item?.calories || 0} cal • ${item?.serving || ''}`;
            } else {
                item = await db.getMeal(log.itemId);
                name = item?.name || 'Unknown Meal';
                details = `${item?.totalCalories || 0} cal • ${item?.foods?.length || 0} foods`;
            }

            const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            const mealDiv = document.createElement('div');
            mealDiv.className = 'meal-item';
            mealDiv.innerHTML = `
                <div class="meal-info">
                    <div class="meal-name">${name}</div>
                    <div class="meal-details">${details} • ${time}</div>
                </div>
                <div class="meal-actions">
                    <button class="btn-icon" onclick="app.deleteLog(${log.id})">🗑️</button>
                </div>
            `;
            container.appendChild(mealDiv);
        }
    }

    async deleteLog(logId) {
        if (confirm('Delete this log entry?')) {
            await db.deleteLog(logId);
            await this.updateDashboard();
        }
    }

    // Quick Add
    async openQuickAdd() {
        const modal = document.getElementById('quick-add-modal');
        modal.classList.add('active');
        document.getElementById('quick-search').value = '';
        document.getElementById('quick-results').innerHTML = '';
    }

    async quickSearch(query) {
        const resultsContainer = document.getElementById('quick-results');

        if (!query) {
            resultsContainer.innerHTML = '';
            return;
        }

        const foods = await db.searchFoods(query);
        const meals = await db.searchMeals(query);
        const combined = [
            ...foods.map(f => ({ ...f, type: 'food' })),
            ...meals.map(m => ({ ...m, type: 'meal' }))
        ];

        resultsContainer.innerHTML = '';
        combined.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <div class="result-info">
                    <h4>${item.name}</h4>
                    <div class="result-details">
                        ${item.type === 'food'
                            ? `${item.calories} cal • ${item.serving || ''}`
                            : `${item.totalCalories} cal • ${item.foods.length} foods`
                        }
                    </div>
                </div>
                <button type="button" class="btn btn-primary" onclick="app.logItem('${item.type}', ${item.id})">Add</button>
            `;
            resultsContainer.appendChild(div);
        });
    }

    async logItem(type, itemId) {
        await db.addLog({ type, itemId });
        await this.updateDashboard();
        document.getElementById('quick-add-modal').classList.remove('active');
        this.showToast(`${type === 'food' ? 'Food' : 'Meal'} logged successfully!`);
    }

    // Foods
    async loadFoods() {
        const foods = await db.getAllFoods();
        this.displayFoods(foods);
    }

    async searchFoods(query) {
        if (!query) {
            await this.loadFoods();
            return;
        }
        const foods = await db.searchFoods(query);
        this.displayFoods(foods);
    }

    displayFoods(foods) {
        const container = document.getElementById('foods-list');
        container.innerHTML = '';

        if (foods.length === 0) {
            container.innerHTML = '<p class="empty-state">No foods found</p>';
            return;
        }

        foods.forEach(food => {
            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div class="meal-info">
                    <div class="meal-name">${food.name}</div>
                    <div class="meal-details">
                        ${food.calories} cal • P: ${food.protein}g • C: ${food.carbs}g • F: ${food.fat}g
                        ${food.serving ? ` • ${food.serving}` : ''}
                    </div>
                </div>
                <div class="meal-actions">
                    <button class="btn-icon" onclick="app.deleteFood(${food.id})">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async deleteFood(foodId) {
        if (confirm('Delete this food?')) {
            await db.deleteFood(foodId);
            await this.loadFoods();
        }
    }

    openCustomFoodModal() {
        document.getElementById('custom-food-modal').classList.add('active');
        document.getElementById('custom-food-form').reset();
    }

    async addCustomFood(e) {
        e.preventDefault();

        const food = {
            name: document.getElementById('food-name').value,
            serving: document.getElementById('food-serving').value,
            calories: parseFloat(document.getElementById('food-calories').value),
            protein: parseFloat(document.getElementById('food-protein').value),
            carbs: parseFloat(document.getElementById('food-carbs').value),
            fat: parseFloat(document.getElementById('food-fat').value)
        };

        await db.addFood(food);
        document.getElementById('custom-food-modal').classList.remove('active');
        await this.loadFoods();
        this.showToast('Food added successfully!');
    }

    // Meals
    async loadMeals() {
        const meals = await db.getAllMeals();
        const container = document.getElementById('meals-list');
        container.innerHTML = '';

        if (meals.length === 0) {
            container.innerHTML = '<p class="empty-state">No meals created yet</p>';
            return;
        }

        meals.forEach(meal => {
            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div class="meal-info">
                    <div class="meal-name">${meal.name}</div>
                    <div class="meal-details">
                        ${meal.totalCalories} cal • P: ${meal.totalProtein}g • C: ${meal.totalCarbs}g • F: ${meal.totalFat}g
                        <br>${meal.foods.length} foods
                    </div>
                </div>
                <div class="meal-actions">
                    <button class="btn-icon" onclick="app.deleteMeal(${meal.id})">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async deleteMeal(mealId) {
        if (confirm('Delete this meal?')) {
            await db.deleteMeal(mealId);
            await this.loadMeals();
        }
    }

    openCreateMealModal() {
        document.getElementById('create-meal-modal').classList.add('active');
        document.getElementById('create-meal-form').reset();
        this.selectedFoodsForMeal = [];
        document.getElementById('selected-foods').innerHTML = '<p class="empty-state">No foods selected</p>';
        document.getElementById('meal-food-results').innerHTML = '';
    }

    async searchFoodsForMeal(query) {
        const resultsContainer = document.getElementById('meal-food-results');

        if (!query) {
            resultsContainer.innerHTML = '';
            return;
        }

        const foods = await db.searchFoods(query);
        resultsContainer.innerHTML = '';

        foods.forEach(food => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <div class="result-info">
                    <h4>${food.name}</h4>
                    <div class="result-details">${food.calories} cal • ${food.serving || ''}</div>
                </div>
                <button type="button" class="btn btn-primary" onclick="app.addFoodToMeal(${food.id}, '${food.name.replace(/'/g, "\\'")}')">Add</button>
            `;
            resultsContainer.appendChild(div);
        });
    }

    async addFoodToMeal(foodId, foodName) {
        if (!this.selectedFoodsForMeal.find(f => f.id === foodId)) {
            this.selectedFoodsForMeal.push({ id: foodId, name: foodName });
            this.updateSelectedFoods();
        }
    }

    removeFoodFromMeal(foodId) {
        this.selectedFoodsForMeal = this.selectedFoodsForMeal.filter(f => f.id !== foodId);
        this.updateSelectedFoods();
    }

    updateSelectedFoods() {
        const container = document.getElementById('selected-foods');

        if (this.selectedFoodsForMeal.length === 0) {
            container.innerHTML = '<p class="empty-state">No foods selected</p>';
            return;
        }

        container.innerHTML = '';
        this.selectedFoodsForMeal.forEach(food => {
            const div = document.createElement('div');
            div.className = 'selected-food-item';
            div.innerHTML = `
                <span>${food.name}</span>
                <button onclick="app.removeFoodFromMeal(${food.id})">Remove</button>
            `;
            container.appendChild(div);
        });
    }

    async createMeal(e) {
        e.preventDefault();

        if (this.selectedFoodsForMeal.length === 0) {
            alert('Please add at least one food to the meal');
            return;
        }

        const mealName = document.getElementById('meal-name').value;

        // Calculate totals
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        for (const selectedFood of this.selectedFoodsForMeal) {
            const food = await db.getFood(selectedFood.id);
            if (food) {
                totalCalories += food.calories || 0;
                totalProtein += food.protein || 0;
                totalCarbs += food.carbs || 0;
                totalFat += food.fat || 0;
            }
        }

        const meal = {
            name: mealName,
            foods: this.selectedFoodsForMeal,
            totalCalories: Math.round(totalCalories),
            totalProtein: Math.round(totalProtein),
            totalCarbs: Math.round(totalCarbs),
            totalFat: Math.round(totalFat)
        };

        await db.addMeal(meal);
        document.getElementById('create-meal-modal').classList.remove('active');
        await this.loadMeals();
        this.showToast('Meal created successfully!');
    }

    // Settings
    async loadSettings() {
        const goals = await db.getSetting('goals');
        document.getElementById('calorie-goal').value = goals.calorieGoal;
        document.getElementById('protein-goal').value = goals.proteinGoal;
        document.getElementById('carbs-goal').value = goals.carbsGoal;
        document.getElementById('fat-goal').value = goals.fatGoal;
    }

    async saveGoals() {
        const goals = {
            calorieGoal: parseInt(document.getElementById('calorie-goal').value),
            proteinGoal: parseInt(document.getElementById('protein-goal').value),
            carbsGoal: parseInt(document.getElementById('carbs-goal').value),
            fatGoal: parseInt(document.getElementById('fat-goal').value)
        };

        await db.updateSetting('goals', goals);
        await this.updateDashboard();
        this.showToast('Goals saved successfully!');
    }

    async enableNotifications() {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications');
            return;
        }

        if (!('serviceWorker' in navigator)) {
            alert('Service workers are not supported');
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            await db.updateSetting('notifications', { enabled: true, times: ['11:00', '15:00', '20:00'] });
            await this.updateNotificationStatus();
            await this.scheduleNotifications();
            this.showToast('Notifications enabled!');
        } else {
            alert('Notification permission denied');
        }
    }

    async updateNotificationStatus() {
        const settings = await db.getSetting('notifications');
        const statusEl = document.getElementById('notification-status');

        if (settings && settings.enabled && Notification.permission === 'granted') {
            statusEl.textContent = 'Enabled';
            statusEl.style.color = 'var(--primary-color)';
        } else {
            statusEl.textContent = 'Not enabled';
            statusEl.style.color = 'var(--text-secondary)';
        }
    }

    async scheduleNotifications() {
        // Send notification times to service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_NOTIFICATIONS',
                times: ['11:00', '15:00', '20:00']
            });
        }
    }

    async exportData() {
        const data = await db.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mealprep-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully!');
    }

    async clearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            await db.clearAllData();
            await this.updateDashboard();
            await this.loadFoods();
            await this.loadMeals();
            this.showToast('All data cleared');
        }
    }

    // Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'LOG_ITEM') {
                        this.logItem(event.data.itemType, event.data.itemId);
                    } else if (event.data.type === 'REFRESH_DASHBOARD') {
                        this.updateDashboard();
                    }
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // PWA Install
    setupPWAInstall() {
        let deferredPrompt;
        const installBtn = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: var(--text-primary);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            animation: slideUp 0.3s;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize app
const app = new MealPrepApp();
document.addEventListener('DOMContentLoaded', () => app.init());
