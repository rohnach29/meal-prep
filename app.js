// USDA FoodData Central API Service
class USDAFoodService {
    constructor() {
        // Using the free USDA FoodData Central API
        this.baseUrl = 'https://api.nal.usda.gov/fdc/v1';
        this.apiKey = 'DEMO_KEY'; // Free demo key - rate limited but works
    }

    async searchFoods(query, pageSize = 10) {
        try {
            const response = await fetch(`${this.baseUrl}/foods/search?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR Legacy`);
            if (!response.ok) throw new Error('USDA API error');
            const data = await response.json();
            return data.foods || [];
        } catch (error) {
            console.error('USDA search error:', error);
            return [];
        }
    }

    async getFoodDetails(fdcId) {
        try {
            const response = await fetch(`${this.baseUrl}/food/${fdcId}?api_key=${this.apiKey}`);
            if (!response.ok) throw new Error('USDA API error');
            return await response.json();
        } catch (error) {
            console.error('USDA food details error:', error);
            return null;
        }
    }

    // Map USDA nutrient IDs to our schema
    mapNutrients(usdaFood) {
        const nutrients = {};
        const nutrientMap = {
            1008: 'calories',      // Energy (kcal)
            1003: 'protein',       // Protein
            1005: 'carbs',         // Carbohydrate
            1004: 'fat',           // Total lipid
            1079: 'fiber',         // Fiber
            2000: 'sugar',         // Sugars
            // Fatty acids
            1292: 'omega3',        // Fatty acids, total polyunsaturated (approx, needs EPA+DHA+ALA)
            1316: 'omega6',        // 18:2 n-6 (Linoleic)
            1258: 'saturatedFat',  // Fatty acids, total saturated
            // Minerals
            1087: 'calcium',
            1089: 'iron',
            1090: 'magnesium',
            1091: 'phosphorus',
            1092: 'potassium',
            1093: 'sodium',
            1095: 'zinc',
            1098: 'copper',
            1101: 'manganese',
            1103: 'selenium',
            // Vitamins
            1106: 'vitaminA',      // Vitamin A, RAE
            1162: 'vitaminC',      // Vitamin C
            1114: 'vitaminD',      // Vitamin D (D2 + D3)
            1109: 'vitaminE',      // Vitamin E
            1185: 'vitaminK',      // Vitamin K (phylloquinone)
            1165: 'vitaminB1',     // Thiamin
            1166: 'vitaminB2',     // Riboflavin
            1167: 'vitaminB3',     // Niacin
            1170: 'vitaminB5',     // Pantothenic acid
            1175: 'vitaminB6',     // Vitamin B-6
            1176: 'vitaminB7',     // Biotin
            1177: 'vitaminB9',     // Folate
            1178: 'vitaminB12',    // Vitamin B-12
            1180: 'choline'        // Choline
        };

        // Initialize with zeros
        Object.values(nutrientMap).forEach(key => nutrients[key] = 0);

        // Map USDA nutrients to our schema
        if (usdaFood.foodNutrients) {
            for (const nutrient of usdaFood.foodNutrients) {
                const id = nutrient.nutrientId || nutrient.nutrient?.id;
                const value = nutrient.value || nutrient.amount || 0;
                if (nutrientMap[id]) {
                    nutrients[nutrientMap[id]] = Math.round(value * 100) / 100;
                }
            }
        }

        // Calculate omega3 from EPA + DHA + ALA if available
        const epa = this.getNutrientValue(usdaFood, 1278); // EPA
        const dha = this.getNutrientValue(usdaFood, 1272); // DHA
        const ala = this.getNutrientValue(usdaFood, 1404); // ALA
        if (epa || dha || ala) {
            nutrients.omega3 = Math.round((epa + dha + ala) * 100) / 100;
        }

        return nutrients;
    }

    getNutrientValue(food, nutrientId) {
        if (!food.foodNutrients) return 0;
        const nutrient = food.foodNutrients.find(n =>
            (n.nutrientId || n.nutrient?.id) === nutrientId
        );
        return nutrient ? (nutrient.value || nutrient.amount || 0) : 0;
    }

    // Convert USDA food to our format
    convertToLocalFood(usdaFood) {
        const nutrients = this.mapNutrients(usdaFood);
        return {
            name: usdaFood.description || usdaFood.lowercaseDescription || 'Unknown Food',
            serving: usdaFood.servingSize ? `${usdaFood.servingSize}${usdaFood.servingSizeUnit || 'g'}` : '100g',
            fdcId: usdaFood.fdcId,
            source: 'usda',
            ...nutrients
        };
    }
}

// Initialize USDA service
const usdaService = new USDAFoodService();

// Main App Logic
class MealPrepApp {
    constructor() {
        this.currentView = 'dashboard';
        this.selectedFoodsForMeal = [];
        this.searchTimeout = null;
        this.currentNutrientView = 'macros'; // macros, vitamins, minerals
    }

    async init() {
        await db.init();
        await this.ensureProfileAndGoals();
        await db.addSampleLogsIfNeeded();
        this.setupEventListeners();
        this.setupModals();
        this.registerServiceWorker();
        this.setupPWAInstall();
        await this.updateDashboard();
        await this.updateNotificationStatus();
        await this.checkPushSubscription();
    }

    async ensureProfileAndGoals() {
        // Ensure profile exists
        let profile = await db.getSetting('profile');
        if (!profile) {
            await db.updateSetting('profile', db.getDefaultProfile());
        }

        // Ensure goals exist with all micronutrients
        let goals = await db.getSetting('goals');
        if (!goals || !goals.omega3Goal) {
            const defaultGoals = db.getDefaultGoals();
            await db.updateSetting('goals', { ...defaultGoals, ...goals });
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.view));
        });

        // Dashboard
        document.getElementById('quick-add-btn').addEventListener('click', () => this.openQuickAdd());

        // Nutrient view tabs
        document.querySelectorAll('.nutrient-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchNutrientView(tab.dataset.nutrients));
        });

        // Foods
        document.getElementById('food-search').addEventListener('input', (e) => this.searchFoodsWithAPI(e.target.value));
        document.getElementById('add-custom-food-btn').addEventListener('click', () => this.openCustomFoodModal());

        // Meals
        document.getElementById('create-meal-btn').addEventListener('click', () => this.openCreateMealModal());

        // Settings - Profile
        document.getElementById('save-profile-btn')?.addEventListener('click', () => this.saveProfile());
        document.getElementById('calculate-goals-btn')?.addEventListener('click', () => this.calculateGoalsFromProfile());

        // Settings - Goals
        document.getElementById('save-goals-btn').addEventListener('click', () => this.saveGoals());
        document.getElementById('subscribe-push-btn').addEventListener('click', () => this.subscribeToPush());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('clear-data-btn').addEventListener('click', () => this.clearData());

        // Forms
        document.getElementById('custom-food-form').addEventListener('submit', (e) => this.addCustomFood(e));
        document.getElementById('create-meal-form').addEventListener('submit', (e) => this.createMeal(e));
        document.getElementById('meal-food-search').addEventListener('input', (e) => this.searchFoodsForMeal(e.target.value));
        document.getElementById('quantity-form').addEventListener('submit', (e) => this.submitQuantity(e));
        document.getElementById('edit-food-form').addEventListener('submit', (e) => this.submitEditFood(e));
        document.getElementById('edit-log-form').addEventListener('submit', (e) => this.submitEditLog(e));

        // Quick search with USDA integration
        document.getElementById('quick-search').addEventListener('input', (e) => this.quickSearchWithAPI(e.target.value));
    }

    setupModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => modal.classList.remove('active'));
            }
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

    switchNutrientView(view) {
        this.currentNutrientView = view;
        document.querySelectorAll('.nutrient-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-nutrients="${view}"]`)?.classList.add('active');
        this.updateNutrientDisplay();
    }

    // Dashboard with full nutrient tracking
    async updateDashboard() {
        const logs = await db.getTodayLogs();
        const goals = await db.getSetting('goals');

        // Initialize all nutrient totals
        const totals = this.initializeNutrientTotals();

        // Calculate totals from logs
        for (const log of logs) {
            const quantity = log.quantity || 1;
            if (log.type === 'food') {
                const food = await db.getFood(log.itemId);
                if (food) {
                    this.addNutrients(totals, food, quantity);
                }
            } else if (log.type === 'meal') {
                const meal = await db.getMeal(log.itemId);
                if (meal) {
                    // For meals, we need to get nutrients from each food
                    if (meal.foods) {
                        for (const mealFood of meal.foods) {
                            const food = await db.getFood(mealFood.id);
                            if (food) {
                                this.addNutrients(totals, food, quantity);
                            }
                        }
                    } else {
                        // Fallback to meal totals if no food breakdown
                        totals.calories += (meal.totalCalories || 0) * quantity;
                        totals.protein += (meal.totalProtein || 0) * quantity;
                        totals.carbs += (meal.totalCarbs || 0) * quantity;
                        totals.fat += (meal.totalFat || 0) * quantity;
                    }
                }
            }
        }

        // Store totals for display
        this.currentTotals = totals;
        this.currentGoals = goals;

        // Update main calorie display
        document.querySelector('.current-calories').textContent = Math.round(totals.calories);
        document.querySelector('.goal-calories').textContent = `/ ${goals.calorieGoal} cal`;

        // Update macro stats
        const macroValues = document.querySelectorAll('.macro-value');
        if (macroValues.length >= 3) {
            macroValues[0].textContent = `${Math.round(totals.protein)}g`;
            macroValues[1].textContent = `${Math.round(totals.carbs)}g`;
            macroValues[2].textContent = `${Math.round(totals.fat)}g`;
        }

        // Update omega ratio display
        this.updateOmegaRatio(totals);

        // Update nutrient displays
        this.updateNutrientDisplay();

        // Update today's meals list
        await this.updateTodayMealsList(logs);
    }

    initializeNutrientTotals() {
        return {
            calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
            omega3: 0, omega6: 0, saturatedFat: 0,
            calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0,
            sodium: 0, zinc: 0, copper: 0, manganese: 0, selenium: 0,
            vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
            vitaminB1: 0, vitaminB2: 0, vitaminB3: 0, vitaminB5: 0, vitaminB6: 0,
            vitaminB7: 0, vitaminB9: 0, vitaminB12: 0, choline: 0
        };
    }

    addNutrients(totals, food, quantity) {
        const nutrients = [
            'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
            'omega3', 'omega6', 'saturatedFat',
            'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium',
            'sodium', 'zinc', 'copper', 'manganese', 'selenium',
            'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
            'vitaminB1', 'vitaminB2', 'vitaminB3', 'vitaminB5', 'vitaminB6',
            'vitaminB7', 'vitaminB9', 'vitaminB12', 'choline'
        ];
        nutrients.forEach(n => {
            totals[n] += (food[n] || 0) * quantity;
        });
    }

    updateOmegaRatio(totals) {
        const omegaRatioEl = document.getElementById('omega-ratio');
        const omegaStatusEl = document.getElementById('omega-status');

        if (!omegaRatioEl) return;

        if (totals.omega3 > 0 && totals.omega6 > 0) {
            const ratio = totals.omega6 / totals.omega3;
            omegaRatioEl.textContent = `1:${ratio.toFixed(1)}`;

            // Ideal ratio is 1:1 to 1:4, typical Western diet is 1:15-20
            if (ratio <= 4) {
                omegaStatusEl.textContent = 'Excellent';
                omegaStatusEl.className = 'omega-status excellent';
            } else if (ratio <= 10) {
                omegaStatusEl.textContent = 'Good';
                omegaStatusEl.className = 'omega-status good';
            } else {
                omegaStatusEl.textContent = 'Needs Improvement';
                omegaStatusEl.className = 'omega-status poor';
            }
        } else {
            omegaRatioEl.textContent = '--';
            omegaStatusEl.textContent = 'Log foods to track';
            omegaStatusEl.className = 'omega-status';
        }

        // Update omega values display
        const omega3El = document.getElementById('omega3-value');
        const omega6El = document.getElementById('omega6-value');
        if (omega3El) omega3El.textContent = `${totals.omega3.toFixed(1)}g`;
        if (omega6El) omega6El.textContent = `${totals.omega6.toFixed(1)}g`;
    }

    updateNutrientDisplay() {
        if (!this.currentTotals || !this.currentGoals) return;

        const container = document.getElementById('nutrient-details');
        if (!container) return;

        const totals = this.currentTotals;
        const goals = this.currentGoals;

        let html = '';

        if (this.currentNutrientView === 'macros') {
            const macros = [
                { name: 'Fiber', value: totals.fiber, goal: goals.fiberGoal, unit: 'g' },
                { name: 'Sugar', value: totals.sugar, goal: goals.sugarGoal, unit: 'g', isLimit: true },
                { name: 'Saturated Fat', value: totals.saturatedFat, goal: goals.saturatedFatGoal, unit: 'g', isLimit: true },
                { name: 'Sodium', value: totals.sodium, goal: goals.sodiumGoal, unit: 'mg', isLimit: true }
            ];
            html = this.renderNutrientBars(macros);
        } else if (this.currentNutrientView === 'vitamins') {
            const vitamins = [
                { name: 'Vitamin A', value: totals.vitaminA, goal: goals.vitaminAGoal, unit: 'mcg' },
                { name: 'Vitamin C', value: totals.vitaminC, goal: goals.vitaminCGoal, unit: 'mg' },
                { name: 'Vitamin D', value: totals.vitaminD, goal: goals.vitaminDGoal, unit: 'mcg' },
                { name: 'Vitamin E', value: totals.vitaminE, goal: goals.vitaminEGoal, unit: 'mg' },
                { name: 'Vitamin K', value: totals.vitaminK, goal: goals.vitaminKGoal, unit: 'mcg' },
                { name: 'B1 (Thiamin)', value: totals.vitaminB1, goal: goals.vitaminB1Goal, unit: 'mg' },
                { name: 'B2 (Riboflavin)', value: totals.vitaminB2, goal: goals.vitaminB2Goal, unit: 'mg' },
                { name: 'B3 (Niacin)', value: totals.vitaminB3, goal: goals.vitaminB3Goal, unit: 'mg' },
                { name: 'B6', value: totals.vitaminB6, goal: goals.vitaminB6Goal, unit: 'mg' },
                { name: 'B9 (Folate)', value: totals.vitaminB9, goal: goals.vitaminB9Goal, unit: 'mcg' },
                { name: 'B12', value: totals.vitaminB12, goal: goals.vitaminB12Goal, unit: 'mcg' },
                { name: 'Choline', value: totals.choline, goal: goals.cholineGoal, unit: 'mg' }
            ];
            html = this.renderNutrientBars(vitamins);
        } else if (this.currentNutrientView === 'minerals') {
            const minerals = [
                { name: 'Calcium', value: totals.calcium, goal: goals.calciumGoal, unit: 'mg' },
                { name: 'Iron', value: totals.iron, goal: goals.ironGoal, unit: 'mg' },
                { name: 'Magnesium', value: totals.magnesium, goal: goals.magnesiumGoal, unit: 'mg' },
                { name: 'Phosphorus', value: totals.phosphorus, goal: goals.phosphorusGoal, unit: 'mg' },
                { name: 'Potassium', value: totals.potassium, goal: goals.potassiumGoal, unit: 'mg' },
                { name: 'Zinc', value: totals.zinc, goal: goals.zincGoal, unit: 'mg' },
                { name: 'Copper', value: totals.copper, goal: goals.copperGoal, unit: 'mg' },
                { name: 'Manganese', value: totals.manganese, goal: goals.manganeseGoal, unit: 'mg' },
                { name: 'Selenium', value: totals.selenium, goal: goals.seleniumGoal, unit: 'mcg' }
            ];
            html = this.renderNutrientBars(minerals);
        }

        container.innerHTML = html;
    }

    renderNutrientBars(nutrients) {
        return nutrients.map(n => {
            const percent = Math.min((n.value / n.goal) * 100, 100);
            const displayValue = n.value < 10 ? n.value.toFixed(1) : Math.round(n.value);
            const isOver = n.isLimit && n.value > n.goal;
            const statusClass = isOver ? 'over-limit' : (percent >= 100 ? 'complete' : '');

            return `
                <div class="nutrient-bar-item ${statusClass}">
                    <div class="nutrient-bar-header">
                        <span class="nutrient-name">${n.name}</span>
                        <span class="nutrient-values">${displayValue} / ${n.goal}${n.unit}</span>
                    </div>
                    <div class="nutrient-bar">
                        <div class="nutrient-bar-fill ${n.isLimit ? 'limit' : ''}" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');
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
            const quantityText = quantity !== 1 ? ` x ${quantity}` : '';

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

    // Quick Add with USDA API
    async openQuickAdd() {
        const modal = document.getElementById('quick-add-modal');
        modal.classList.add('active');
        document.getElementById('quick-search').value = '';
        document.getElementById('quick-results').innerHTML = '';
        document.getElementById('usda-results').innerHTML = '';
    }

    async quickSearchWithAPI(query) {
        const localResultsContainer = document.getElementById('quick-results');
        const usdaResultsContainer = document.getElementById('usda-results');

        if (!query || query.length < 2) {
            localResultsContainer.innerHTML = '';
            usdaResultsContainer.innerHTML = '';
            return;
        }

        // Search local database
        const foods = await db.searchFoods(query);
        const meals = await db.searchMeals(query);
        const combined = [
            ...foods.map(f => ({ ...f, type: 'food' })),
            ...meals.map(m => ({ ...m, type: 'meal' }))
        ];

        // Display local results
        localResultsContainer.innerHTML = '';
        if (combined.length > 0) {
            localResultsContainer.innerHTML = '<h4 class="results-header">Your Foods</h4>';
            combined.forEach(item => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `
                    <div class="result-info">
                        <h4>${item.name}</h4>
                        <div class="result-details">
                            ${item.type === 'food'
                                ? `${item.calories} cal • P: ${item.protein}g • ${item.serving || ''}`
                                : `${item.totalCalories} cal • ${item.foods.length} foods`
                            }
                        </div>
                    </div>
                    <button type="button" class="btn btn-primary" onclick="app.logItem('${item.type}', ${item.id})">Add</button>
                `;
                localResultsContainer.appendChild(div);
            });
        }

        // Debounce USDA API search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            usdaResultsContainer.innerHTML = '<p class="loading">Searching USDA database...</p>';

            const usdaFoods = await usdaService.searchFoods(query, 5);

            if (usdaFoods.length > 0) {
                usdaResultsContainer.innerHTML = '<h4 class="results-header">USDA Database</h4>';
                usdaFoods.forEach(food => {
                    const localFood = usdaService.convertToLocalFood(food);
                    const div = document.createElement('div');
                    div.className = 'result-item usda-item';
                    div.innerHTML = `
                        <div class="result-info">
                            <h4>${localFood.name}</h4>
                            <div class="result-details">
                                ${localFood.calories} cal • P: ${localFood.protein}g • C: ${localFood.carbs}g • F: ${localFood.fat}g
                                <br><span class="source-badge">USDA</span> ${localFood.serving}
                            </div>
                        </div>
                        <button type="button" class="btn btn-secondary" onclick='app.addUSDAFood(${JSON.stringify(localFood).replace(/'/g, "&#39;")})'>Add to Library</button>
                    `;
                    usdaResultsContainer.appendChild(div);
                });
            } else {
                usdaResultsContainer.innerHTML = '<p class="empty-state">No results from USDA database</p>';
            }
        }, 500);
    }

    async addUSDAFood(foodData) {
        const foodId = await db.addFood(foodData);
        this.showToast(`${foodData.name} added to your library!`);

        // Offer to log it immediately
        if (confirm(`Log ${foodData.name} now?`)) {
            this.logItem('food', foodId);
        }
    }

    async logItem(type, itemId) {
        this.pendingLog = { type, itemId };

        let item;
        if (type === 'food') {
            item = await db.getFood(itemId);
        } else {
            item = await db.getMeal(itemId);
        }

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

    // Foods with USDA search
    async loadFoods() {
        const foods = await db.getAllFoods();
        this.displayFoods(foods);
    }

    async searchFoodsWithAPI(query) {
        if (!query) {
            await this.loadFoods();
            return;
        }

        const localFoods = await db.searchFoods(query);
        this.displayFoods(localFoods);

        // Also search USDA if query is long enough
        if (query.length >= 3) {
            const usdaContainer = document.getElementById('usda-search-results');
            if (usdaContainer) {
                usdaContainer.innerHTML = '<p class="loading">Searching USDA...</p>';

                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(async () => {
                    const usdaFoods = await usdaService.searchFoods(query, 5);
                    if (usdaFoods.length > 0) {
                        usdaContainer.innerHTML = '<h4>USDA Results</h4>';
                        usdaFoods.forEach(food => {
                            const localFood = usdaService.convertToLocalFood(food);
                            const div = document.createElement('div');
                            div.className = 'item-card usda-item';
                            div.innerHTML = `
                                <div class="meal-info">
                                    <div class="meal-name">${localFood.name} <span class="source-badge">USDA</span></div>
                                    <div class="meal-details">
                                        ${localFood.calories} cal • P: ${localFood.protein}g • C: ${localFood.carbs}g • F: ${localFood.fat}g
                                    </div>
                                </div>
                                <button class="btn btn-secondary" onclick='app.addUSDAFood(${JSON.stringify(localFood).replace(/'/g, "&#39;")})'>+ Add</button>
                            `;
                            usdaContainer.appendChild(div);
                        });
                    } else {
                        usdaContainer.innerHTML = '';
                    }
                }, 500);
            }
        }
    }

    displayFoods(foods) {
        const container = document.getElementById('foods-list');
        container.innerHTML = '';

        if (foods.length === 0) {
            container.innerHTML = '<p class="empty-state">No foods found. Search USDA database above!</p>';
            return;
        }

        foods.forEach(food => {
            const sourceTag = food.source === 'usda' ? '<span class="source-badge">USDA</span>' : '';
            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div class="meal-info">
                    <div class="meal-name">${food.name} ${sourceTag}</div>
                    <div class="meal-details">
                        ${food.calories} cal • P: ${food.protein}g • C: ${food.carbs}g • F: ${food.fat}g
                        ${food.serving ? ` • ${food.serving}` : ''}
                    </div>
                    <div class="meal-details micro-preview">
                        ${food.omega3 > 0 ? `Ω3: ${food.omega3}g` : ''}
                        ${food.vitaminC > 0 ? `C: ${food.vitaminC}mg` : ''}
                        ${food.iron > 0 ? `Fe: ${food.iron}mg` : ''}
                    </div>
                </div>
                <div class="meal-actions">
                    <button class="btn-icon" onclick="app.viewFoodDetails(${food.id})" title="View details">📊</button>
                    <button class="btn-icon" onclick="app.openEditFood(${food.id})" title="Edit food">✏️</button>
                    <button class="btn-icon" onclick="app.deleteFood(${food.id})" title="Delete">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async viewFoodDetails(foodId) {
        const food = await db.getFood(foodId);
        if (!food) return;

        const modal = document.getElementById('food-details-modal');
        const content = document.getElementById('food-details-content');

        content.innerHTML = `
            <h3>${food.name}</h3>
            <p class="serving-info">Serving: ${food.serving}</p>

            <div class="nutrient-section">
                <h4>Macronutrients</h4>
                <div class="nutrient-grid">
                    <div class="nutrient-cell"><span>Calories</span><strong>${food.calories}</strong></div>
                    <div class="nutrient-cell"><span>Protein</span><strong>${food.protein}g</strong></div>
                    <div class="nutrient-cell"><span>Carbs</span><strong>${food.carbs}g</strong></div>
                    <div class="nutrient-cell"><span>Fat</span><strong>${food.fat}g</strong></div>
                    <div class="nutrient-cell"><span>Fiber</span><strong>${food.fiber}g</strong></div>
                    <div class="nutrient-cell"><span>Sugar</span><strong>${food.sugar}g</strong></div>
                </div>
            </div>

            <div class="nutrient-section">
                <h4>Fatty Acids</h4>
                <div class="nutrient-grid">
                    <div class="nutrient-cell"><span>Omega-3</span><strong>${food.omega3}g</strong></div>
                    <div class="nutrient-cell"><span>Omega-6</span><strong>${food.omega6}g</strong></div>
                    <div class="nutrient-cell"><span>Saturated</span><strong>${food.saturatedFat}g</strong></div>
                </div>
            </div>

            <div class="nutrient-section">
                <h4>Vitamins</h4>
                <div class="nutrient-grid">
                    <div class="nutrient-cell"><span>Vitamin A</span><strong>${food.vitaminA}mcg</strong></div>
                    <div class="nutrient-cell"><span>Vitamin C</span><strong>${food.vitaminC}mg</strong></div>
                    <div class="nutrient-cell"><span>Vitamin D</span><strong>${food.vitaminD}mcg</strong></div>
                    <div class="nutrient-cell"><span>Vitamin E</span><strong>${food.vitaminE}mg</strong></div>
                    <div class="nutrient-cell"><span>Vitamin K</span><strong>${food.vitaminK}mcg</strong></div>
                    <div class="nutrient-cell"><span>B1</span><strong>${food.vitaminB1}mg</strong></div>
                    <div class="nutrient-cell"><span>B2</span><strong>${food.vitaminB2}mg</strong></div>
                    <div class="nutrient-cell"><span>B3</span><strong>${food.vitaminB3}mg</strong></div>
                    <div class="nutrient-cell"><span>B6</span><strong>${food.vitaminB6}mg</strong></div>
                    <div class="nutrient-cell"><span>B9 (Folate)</span><strong>${food.vitaminB9}mcg</strong></div>
                    <div class="nutrient-cell"><span>B12</span><strong>${food.vitaminB12}mcg</strong></div>
                    <div class="nutrient-cell"><span>Choline</span><strong>${food.choline}mg</strong></div>
                </div>
            </div>

            <div class="nutrient-section">
                <h4>Minerals</h4>
                <div class="nutrient-grid">
                    <div class="nutrient-cell"><span>Calcium</span><strong>${food.calcium}mg</strong></div>
                    <div class="nutrient-cell"><span>Iron</span><strong>${food.iron}mg</strong></div>
                    <div class="nutrient-cell"><span>Magnesium</span><strong>${food.magnesium}mg</strong></div>
                    <div class="nutrient-cell"><span>Phosphorus</span><strong>${food.phosphorus}mg</strong></div>
                    <div class="nutrient-cell"><span>Potassium</span><strong>${food.potassium}mg</strong></div>
                    <div class="nutrient-cell"><span>Sodium</span><strong>${food.sodium}mg</strong></div>
                    <div class="nutrient-cell"><span>Zinc</span><strong>${food.zinc}mg</strong></div>
                    <div class="nutrient-cell"><span>Copper</span><strong>${food.copper}mg</strong></div>
                    <div class="nutrient-cell"><span>Manganese</span><strong>${food.manganese}mg</strong></div>
                    <div class="nutrient-cell"><span>Selenium</span><strong>${food.selenium}mcg</strong></div>
                </div>
            </div>
        `;

        modal.classList.add('active');
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
            fat: parseFloat(document.getElementById('food-fat').value),
            source: 'manual'
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

        // Calculate totals for all nutrients
        const totals = this.initializeNutrientTotals();

        for (const selectedFood of this.selectedFoodsForMeal) {
            const food = await db.getFood(selectedFood.id);
            if (food) {
                this.addNutrients(totals, food, 1);
            }
        }

        const meal = {
            name: mealName,
            foods: this.selectedFoodsForMeal,
            totalCalories: Math.round(totals.calories),
            totalProtein: Math.round(totals.protein),
            totalCarbs: Math.round(totals.carbs),
            totalFat: Math.round(totals.fat),
            // Store all nutrients for reference
            nutrients: totals
        };

        await db.addMeal(meal);
        document.getElementById('create-meal-modal').classList.remove('active');
        await this.loadMeals();
        this.showToast('Meal created successfully!');
    }

    // Settings
    async loadSettings() {
        const goals = await db.getSetting('goals');
        const profile = await db.getSetting('profile');

        // Load profile settings
        if (profile) {
            document.getElementById('profile-height').value = profile.height || 170;
            document.getElementById('profile-weight').value = profile.weight || 70;
            document.getElementById('profile-age').value = profile.age || 30;
            document.getElementById('profile-sex').value = profile.sex || 'male';
            document.getElementById('profile-activity').value = profile.activityLevel || 'moderate';
        }

        // Load macro goals
        document.getElementById('calorie-goal').value = goals.calorieGoal;
        document.getElementById('protein-goal').value = goals.proteinGoal;
        document.getElementById('carbs-goal').value = goals.carbsGoal;
        document.getElementById('fat-goal').value = goals.fatGoal;

        this.checkPushSubscription();
    }

    async saveProfile() {
        const profile = {
            height: parseInt(document.getElementById('profile-height').value),
            weight: parseInt(document.getElementById('profile-weight').value),
            age: parseInt(document.getElementById('profile-age').value),
            sex: document.getElementById('profile-sex').value,
            activityLevel: document.getElementById('profile-activity').value
        };

        await db.updateSetting('profile', profile);
        this.showToast('Profile saved! Click "Calculate Goals" to update your targets.');
    }

    async calculateGoalsFromProfile() {
        const profile = await db.getSetting('profile');
        if (!profile) {
            this.showToast('Please save your profile first');
            return;
        }

        const calculatedGoals = db.calculateGoalsFromProfile(profile);

        // Update UI
        document.getElementById('calorie-goal').value = calculatedGoals.calorieGoal;
        document.getElementById('protein-goal').value = calculatedGoals.proteinGoal;
        document.getElementById('carbs-goal').value = calculatedGoals.carbsGoal;
        document.getElementById('fat-goal').value = calculatedGoals.fatGoal;

        // Save goals
        await db.updateSetting('goals', calculatedGoals);
        await this.updateDashboard();

        this.showToast(`Goals calculated! TDEE: ${calculatedGoals.calorieGoal} cal/day`);
    }

    async saveGoals() {
        const currentGoals = await db.getSetting('goals') || db.getDefaultGoals();

        const goals = {
            ...currentGoals,
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
            const existingSettings = await db.getSetting('notifications') || {};
            const times = existingSettings.times || ['11:00', '15:00', '20:00'];

            await db.updateSetting('notifications', {
                enabled: true,
                times: times
            });
            await this.updateNotificationStatus();
            await this.scheduleNotifications();
            this.showToast('Notifications enabled!');
        } else {
            alert('Notification permission denied');
        }
    }

    async subscribeToPush() {
        if (!('PushManager' in window)) {
            this.showToast('Push notifications not supported in this browser');
            return;
        }

        if (!CONFIG || CONFIG.VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
            this.showToast('Push notifications require VAPID key configuration');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                this.showToast('Notification permission denied');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
                });
            }

            const timeInputs = document.querySelectorAll('.notification-time-input');
            const notificationTimes = Array.from(timeInputs)
                .map(input => input.value)
                .filter(time => time)
                .slice(0, 3);

            if (notificationTimes.length === 0) {
                this.showToast('Please set at least one notification time');
                return;
            }

            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            const response = await fetch(CONFIG.API_SUBSCRIBE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    preferences: {
                        times: notificationTimes,
                        timezone: userTimezone
                    }
                })
            });

            if (response.ok) {
                this.updatePushStatus('Subscribed');
                this.showToast('Notification times saved!');
            } else {
                throw new Error('Failed to save subscription');
            }

        } catch (error) {
            console.error('Push subscription error:', error);
            this.showToast('Failed to subscribe');
            this.updatePushStatus('Failed');
        }
    }

    updatePushStatus(status) {
        const statusEl = document.getElementById('push-status');
        if (statusEl) {
            statusEl.textContent = status;
        }
    }

    async checkPushSubscription() {
        if ('PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                this.updatePushStatus(subscription ? 'Subscribed' : 'Not subscribed');
            } catch (error) {
                this.updatePushStatus('Not available');
            }
        } else {
            this.updatePushStatus('Not supported');
        }
    }

    async updateNotificationStatus() {
        const settings = await db.getSetting('notifications');
        const statusEl = document.getElementById('notification-status');

        if (statusEl) {
            if (settings && settings.enabled && Notification.permission === 'granted') {
                statusEl.textContent = 'Enabled';
                statusEl.style.color = 'var(--primary-color)';
            } else {
                statusEl.textContent = 'Not enabled';
                statusEl.style.color = 'var(--text-secondary)';
            }
        }
    }

    async scheduleNotifications() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_NOTIFICATIONS'
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
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    updateViaCache: 'none'
                });

                registration.update();

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('App updated! Refresh for the latest version.');
                        }
                    });
                });

                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'LOG_ITEM') {
                        this.logItem(event.data.itemType, event.data.itemId);
                    } else if (event.data.type === 'REFRESH_DASHBOARD') {
                        this.updateDashboard();
                    }
                });

                await navigator.serviceWorker.ready;
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
            if (installBtn) installBtn.style.display = 'block';
        });

        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice;
                    deferredPrompt = null;
                    installBtn.style.display = 'none';
                }
            });
        }
    }

    showToast(message) {
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

// Helper function for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Initialize app
const app = new MealPrepApp();
document.addEventListener('DOMContentLoaded', () => app.init());
