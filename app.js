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
        await db.addSampleLogsIfNeeded(); // Add sample logs for testing notifications
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
        document.getElementById('save-notification-times-btn').addEventListener('click', () => this.saveNotificationTimes());
        document.getElementById('test-mode-checkbox').addEventListener('change', (e) => this.toggleTestMode(e.target.checked));
        document.getElementById('test-notification-now').addEventListener('click', () => this.testNotificationNow());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('clear-data-btn').addEventListener('click', () => this.clearData());

        // Forms
        document.getElementById('custom-food-form').addEventListener('submit', (e) => this.addCustomFood(e));
        document.getElementById('create-meal-form').addEventListener('submit', (e) => this.createMeal(e));
        document.getElementById('meal-food-search').addEventListener('input', (e) => this.searchFoodsForMeal(e.target.value));
        document.getElementById('quantity-form').addEventListener('submit', (e) => this.submitQuantity(e));
        document.getElementById('edit-food-form').addEventListener('submit', (e) => this.submitEditFood(e));
        document.getElementById('edit-log-form').addEventListener('submit', (e) => this.submitEditLog(e));

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
            const quantity = log.quantity || 1; // Default to 1 if not set
            if (log.type === 'food') {
                const food = await db.getFood(log.itemId);
                if (food) {
                    totalCalories += (food.calories || 0) * quantity;
                    totalProtein += (food.protein || 0) * quantity;
                    totalCarbs += (food.carbs || 0) * quantity;
                    totalFat += (food.fat || 0) * quantity;
                }
            } else if (log.type === 'meal') {
                const meal = await db.getMeal(log.itemId);
                if (meal) {
                    totalCalories += (meal.totalCalories || 0) * quantity;
                    totalProtein += (meal.totalProtein || 0) * quantity;
                    totalCarbs += (meal.totalCarbs || 0) * quantity;
                    totalFat += (meal.totalFat || 0) * quantity;
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
            let baseCalories;
            let totalCalories;
            let extraInfo;

            const quantity = log.quantity || 1;

            if (log.type === 'food') {
                item = await db.getFood(log.itemId);
                name = item?.name || 'Unknown Food';
                baseCalories = item?.calories || 0;
                totalCalories = Math.round(baseCalories * quantity);
                extraInfo = item?.serving || '';
            } else {
                item = await db.getMeal(log.itemId);
                name = item?.name || 'Unknown Meal';
                baseCalories = item?.totalCalories || 0;
                totalCalories = Math.round(baseCalories * quantity);
                extraInfo = `${item?.foods?.length || 0} foods`;
            }

            const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const quantityText = quantity !== 1 ? ` × ${quantity}` : '';

            const mealDiv = document.createElement('div');
            mealDiv.className = 'meal-item';
            mealDiv.innerHTML = `
                <div class="meal-info">
                    <div class="meal-name">${name}${quantityText}</div>
                    <div class="meal-details">${totalCalories} cal${extraInfo ? ` • ${extraInfo}` : ''} • ${time}</div>
                </div>
                <div class="meal-actions">
                    <button class="btn-icon" onclick="app.openEditLog(${log.id})" title="Edit quantity">✏️</button>
                    <button class="btn-icon" onclick="app.deleteLog(${log.id})" title="Delete">🗑️</button>
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

    async openEditLog(logId) {
        const log = await db.getLog(logId);
        if (!log) return;

        // Get item name
        let itemName = '';
        if (log.type === 'food') {
            const food = await db.getFood(log.itemId);
            itemName = food?.name || 'Unknown Food';
        } else {
            const meal = await db.getMeal(log.itemId);
            itemName = meal?.name || 'Unknown Meal';
        }

        document.getElementById('edit-log-id').value = logId;
        document.getElementById('edit-log-item-name').textContent = `Editing: ${itemName}`;
        document.getElementById('edit-log-quantity').value = log.quantity || 1;

        document.getElementById('edit-log-modal').classList.add('active');
    }

    async submitEditLog(e) {
        e.preventDefault();

        const logId = parseInt(document.getElementById('edit-log-id').value);
        const quantity = parseFloat(document.getElementById('edit-log-quantity').value);

        await db.updateLog(logId, { quantity: quantity });
        document.getElementById('edit-log-modal').classList.remove('active');
        await this.updateDashboard();
        this.showToast('Log entry updated successfully!');
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
        // Store the pending log info
        this.pendingLog = { type, itemId };

        // Get item details to show name
        let item;
        if (type === 'food') {
            item = await db.getFood(itemId);
        } else {
            item = await db.getMeal(itemId);
        }

        // Show quantity modal
        document.getElementById('quantity-item-name').textContent = `Logging: ${item.name}`;
        document.getElementById('quantity-input').value = 1;
        document.getElementById('quantity-modal').classList.add('active');
        document.getElementById('quick-add-modal').classList.remove('active');
    }

    async submitQuantity(e) {
        e.preventDefault();
        const quantity = parseFloat(document.getElementById('quantity-input').value);

        if (this.pendingLog) {
            await db.addLog({
                type: this.pendingLog.type,
                itemId: this.pendingLog.itemId,
                quantity: quantity
            });

            await this.updateDashboard();
            document.getElementById('quantity-modal').classList.remove('active');
            this.showToast(`${this.pendingLog.type === 'food' ? 'Food' : 'Meal'} logged successfully!`);
            this.pendingLog = null;
        }
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
                    <button class="btn-icon" onclick="app.openEditFood(${food.id})" title="Edit food">✏️</button>
                    <button class="btn-icon" onclick="app.deleteFood(${food.id})" title="Delete">🗑️</button>
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

    async openEditFood(foodId) {
        const food = await db.getFood(foodId);
        if (!food) return;

        document.getElementById('edit-food-id').value = foodId;
        document.getElementById('edit-food-name').value = food.name;
        document.getElementById('edit-food-serving').value = food.serving || '';
        document.getElementById('edit-food-calories').value = food.calories;
        document.getElementById('edit-food-protein').value = food.protein;
        document.getElementById('edit-food-carbs').value = food.carbs;
        document.getElementById('edit-food-fat').value = food.fat;

        document.getElementById('edit-food-modal').classList.add('active');
    }

    async submitEditFood(e) {
        e.preventDefault();

        const foodId = parseInt(document.getElementById('edit-food-id').value);
        const foodData = {
            name: document.getElementById('edit-food-name').value,
            serving: document.getElementById('edit-food-serving').value,
            calories: parseFloat(document.getElementById('edit-food-calories').value),
            protein: parseFloat(document.getElementById('edit-food-protein').value),
            carbs: parseFloat(document.getElementById('edit-food-carbs').value),
            fat: parseFloat(document.getElementById('edit-food-fat').value)
        };

        await db.updateFood(foodId, foodData);
        document.getElementById('edit-food-modal').classList.remove('active');
        await this.loadFoods();
        this.showToast('Food updated successfully!');
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

        // Load notification settings
        const notifSettings = await db.getSetting('notifications');
        if (notifSettings) {
            const times = notifSettings.times || ['11:00', '15:00', '20:00'];
            document.getElementById('notif-time-1').value = times[0] || '11:00';
            document.getElementById('notif-time-2').value = times[1] || '15:00';
            document.getElementById('notif-time-3').value = times[2] || '20:00';
            document.getElementById('test-mode-checkbox').checked = notifSettings.testMode || false;

            this.updateCurrentNotificationTimesList(times);
        }

        // Update system time display
        this.updateSystemTime();
        setInterval(() => this.updateSystemTime(), 1000);
    }

    updateSystemTime() {
        const now = new Date();
        const estTime = now.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        const systemTimeEl = document.getElementById('system-time');
        if (systemTimeEl) {
            systemTimeEl.textContent = estTime + ' EST';
        }
    }

    updateCurrentNotificationTimesList(times) {
        const listEl = document.getElementById('current-notification-times');
        listEl.innerHTML = '';
        times.forEach(time => {
            const [hours, minutes] = time.split(':');
            const hour12 = parseInt(hours) % 12 || 12;
            const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
            const li = document.createElement('li');
            li.textContent = `${hour12}:${minutes} ${ampm} EST`;
            listEl.appendChild(li);
        });
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
            // Get existing settings or use defaults
            const existingSettings = await db.getSetting('notifications') || {};
            const times = existingSettings.times || ['11:00', '15:00', '20:00'];
            const testMode = existingSettings.testMode || false;

            await db.updateSetting('notifications', {
                enabled: true,
                times: times,
                testMode: testMode
            });
            await this.updateNotificationStatus();
            await this.scheduleNotifications();
            this.showToast('Notifications enabled!');
        } else {
            alert('Notification permission denied');
        }
    }

    async saveNotificationTimes() {
        const time1 = document.getElementById('notif-time-1').value;
        const time2 = document.getElementById('notif-time-2').value;
        const time3 = document.getElementById('notif-time-3').value;
        const times = [time1, time2, time3];

        const existingSettings = await db.getSetting('notifications') || {};
        await db.updateSetting('notifications', {
            ...existingSettings,
            times: times
        });

        this.updateCurrentNotificationTimesList(times);
        await this.scheduleNotifications();
        this.showToast('Notification times saved!');
    }

    async toggleTestMode(enabled) {
        const existingSettings = await db.getSetting('notifications') || {};
        await db.updateSetting('notifications', {
            ...existingSettings,
            testMode: enabled
        });

        await this.scheduleNotifications();

        if (enabled) {
            this.showToast('Test mode enabled! Notifications every minute.');
        } else {
            this.showToast('Test mode disabled. Using normal schedule.');
        }
    }

    async testNotificationNow() {
        console.log('🔔 Manual test notification triggered');

        if (Notification.permission !== 'granted') {
            this.showToast('Please enable notifications first!');
            return;
        }

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'TEST_NOTIFICATION_NOW'
            });
            console.log('Sent TEST_NOTIFICATION_NOW to service worker');
            this.showToast('Sending test notifications...');
        } else {
            this.showToast('Service worker not ready. Please refresh the page.');
            console.error('Service worker controller not available');
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

        // Update debug info
        this.updateDebugInfo();
    }

    async updateDebugInfo() {
        // Service Worker status
        const swStatusEl = document.getElementById('sw-status');
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                if (registration.active) {
                    swStatusEl.textContent = '✅ Active';
                    swStatusEl.style.color = 'var(--primary-color)';
                } else {
                    swStatusEl.textContent = '⏳ Installing...';
                    swStatusEl.style.color = 'orange';
                }
            } else {
                swStatusEl.textContent = '❌ Not registered';
                swStatusEl.style.color = 'red';
            }
        } else {
            swStatusEl.textContent = '❌ Not supported';
            swStatusEl.style.color = 'red';
        }

        // Notification permission
        const notifPermEl = document.getElementById('notif-permission');
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                notifPermEl.textContent = '✅ Granted';
                notifPermEl.style.color = 'var(--primary-color)';
            } else if (Notification.permission === 'denied') {
                notifPermEl.textContent = '❌ Denied';
                notifPermEl.style.color = 'red';
            } else {
                notifPermEl.textContent = '⏳ Not requested';
                notifPermEl.style.color = 'orange';
            }
        } else {
            notifPermEl.textContent = '❌ Not supported';
            notifPermEl.style.color = 'red';
        }

        // Previous day logs count
        const logsCountEl = document.getElementById('prev-logs-count');
        try {
            const allLogs = await db.getAllLogs();
            const today = new Date().toISOString().split('T')[0];
            const previousLogs = allLogs.filter(log => log.date !== today);
            logsCountEl.textContent = `${previousLogs.length} logs`;
            if (previousLogs.length === 0) {
                logsCountEl.style.color = 'red';
            } else {
                logsCountEl.style.color = 'var(--primary-color)';
            }
        } catch (error) {
            logsCountEl.textContent = 'Error loading';
            logsCountEl.style.color = 'red';
        }
    }

    async scheduleNotifications() {
        // Trigger service worker to re-read settings and reschedule
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_NOTIFICATIONS'
            });
            console.log('Sent SCHEDULE_NOTIFICATIONS message to service worker');
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
                // Force service worker to update
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    updateViaCache: 'none'
                });

                console.log('✅ Service Worker registered:', registration);

                // Check for updates immediately
                registration.update();

                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New service worker found, installing...');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('✅ New service worker installed, will activate on next page load');
                            this.showToast('App updated! Refresh for the latest version.');
                        }
                    });
                });

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    console.log('Message from service worker:', event.data);

                    if (event.data.type === 'LOG_ITEM') {
                        this.logItem(event.data.itemType, event.data.itemId);
                    } else if (event.data.type === 'REFRESH_DASHBOARD') {
                        this.updateDashboard();
                    }
                });

                // Check if service worker is ready
                await navigator.serviceWorker.ready;
                console.log('✅ Service Worker ready');

            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        } else {
            console.warn('⚠️ Service Workers not supported');
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
