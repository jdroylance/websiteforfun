// ============================================
// CONSTANTS AND CONFIGURATION
// ============================================

// Keys used to store data in browser's localStorage
const STORAGE_KEYS = {
    ITEMS: 'inventory_items',
    CATEGORIES: 'inventory_categories',
    WITHDRAWALS: 'inventory_withdrawals'
};

// Default categories to initialize the app with
const DEFAULT_CATEGORIES = ['Electronics', 'Office Supplies', 'Tools', 'Uncategorized'];

// Variable to store current confirm action callback
let confirmCallback = null;

// ============================================
// STORAGE UTILITIES
// ============================================

/**
 * Saves data to localStorage
 * @param {string} key - The storage key
 * @param {*} data - Data to save (will be converted to JSON)
 * @returns {boolean} - True if successful, false if error
 */
function saveToLocalStorage(key, data) {
    try {
        const jsonString = JSON.stringify(data);
        localStorage.setItem(key, jsonString);
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showNotification('Storage error: Unable to save data. Storage may be full.', 'error');
        return false;
    }
}

/**
 * Loads data from localStorage
 * @param {string} key - The storage key
 * @param {*} defaultValue - Value to return if key doesn't exist
 * @returns {*} - The stored data or default value
 */
function loadFromLocalStorage(key, defaultValue = []) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Initializes localStorage with default data if empty
 */
function initializeStorage() {
    // Initialize categories if not exist
    const categories = loadFromLocalStorage(STORAGE_KEYS.CATEGORIES);
    if (categories.length === 0) {
        saveToLocalStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    }

    // Initialize items array if not exist
    const items = loadFromLocalStorage(STORAGE_KEYS.ITEMS);
    if (!Array.isArray(items)) {
        saveToLocalStorage(STORAGE_KEYS.ITEMS, []);
    }

    // Initialize withdrawals array if not exist
    const withdrawals = loadFromLocalStorage(STORAGE_KEYS.WITHDRAWALS);
    if (!Array.isArray(withdrawals)) {
        saveToLocalStorage(STORAGE_KEYS.WITHDRAWALS, []);
    }
}

// ============================================
// ITEM CRUD OPERATIONS
// ============================================

/**
 * Adds a new item to inventory
 * @param {Object} itemData - The item information
 * @returns {Object} - The created item with generated ID
 */
function addItem(itemData) {
    // Step 1: Create unique ID using timestamp
    const id = 'item_' + Date.now();

    // Step 2: Build complete item object
    const item = {
        id: id,
        name: itemData.name,
        category: itemData.category,
        quantity: parseInt(itemData.quantity),
        unitCost: parseFloat(itemData.unitCost),
        dateAdded: new Date().toISOString(),
        description: itemData.description || ''
    };

    // Step 3: Load existing items from localStorage
    const items = loadFromLocalStorage(STORAGE_KEYS.ITEMS, []);

    // Step 4: Add new item to array
    items.push(item);

    // Step 5: Save updated array back to localStorage
    saveToLocalStorage(STORAGE_KEYS.ITEMS, items);

    // Step 6: Return the created item
    return item;
}

/**
 * Updates an existing item
 * @param {string} itemId - The item ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {boolean} - True if successful, false if item not found
 */
function updateItem(itemId, updates) {
    const items = loadFromLocalStorage(STORAGE_KEYS.ITEMS, []);
    const index = items.findIndex(item => item.id === itemId);

    if (index === -1) {
        return false; // Item not found
    }

    // Update the item with new values
    items[index] = {
        ...items[index],
        ...updates,
        quantity: parseInt(updates.quantity),
        unitCost: parseFloat(updates.unitCost)
    };

    saveToLocalStorage(STORAGE_KEYS.ITEMS, items);
    return true;
}

/**
 * Deletes an item from inventory
 * @param {string} itemId - The item ID to delete
 * @returns {boolean} - True if successful, false if item not found
 */
function deleteItem(itemId) {
    const items = loadFromLocalStorage(STORAGE_KEYS.ITEMS, []);
    const filteredItems = items.filter(item => item.id !== itemId);

    if (filteredItems.length === items.length) {
        return false; // Item not found
    }

    saveToLocalStorage(STORAGE_KEYS.ITEMS, filteredItems);
    return true;
}

/**
 * Gets a single item by ID
 * @param {string} itemId - The item ID
 * @returns {Object|null} - The item or null if not found
 */
function getItem(itemId) {
    const items = loadFromLocalStorage(STORAGE_KEYS.ITEMS, []);
    return items.find(item => item.id === itemId) || null;
}

/**
 * Gets all items from inventory
 * @returns {Array} - Array of all items
 */
function getAllItems() {
    return loadFromLocalStorage(STORAGE_KEYS.ITEMS, []);
}

// ============================================
// CATEGORY OPERATIONS
// ============================================

/**
 * Adds a new category
 * @param {string} categoryName - Name of the category to add
 * @returns {boolean} - True if added, false if already exists
 */
function addCategory(categoryName) {
    const categories = loadFromLocalStorage(STORAGE_KEYS.CATEGORIES, []);

    // Check if category already exists (case-insensitive)
    if (categories.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) {
        return false;
    }

    categories.push(categoryName);
    saveToLocalStorage(STORAGE_KEYS.CATEGORIES, categories);
    return true;
}

/**
 * Deletes a category
 * @param {string} categoryName - Name of the category to delete
 * @returns {boolean} - True if deleted, false if in use or not found
 */
function deleteCategory(categoryName) {
    // Check if category is being used by any items
    const items = getAllItems();
    const inUse = items.some(item => item.category === categoryName);

    if (inUse) {
        showNotification('Cannot delete category: It is being used by one or more items.', 'error');
        return false;
    }

    const categories = loadFromLocalStorage(STORAGE_KEYS.CATEGORIES, []);
    const filteredCategories = categories.filter(cat => cat !== categoryName);

    if (filteredCategories.length === categories.length) {
        return false; // Category not found
    }

    saveToLocalStorage(STORAGE_KEYS.CATEGORIES, filteredCategories);
    return true;
}

/**
 * Gets all categories
 * @returns {Array} - Array of category names
 */
function getAllCategories() {
    return loadFromLocalStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
}

// ============================================
// WITHDRAWAL OPERATIONS
// ============================================

/**
 * Records a withdrawal of items from inventory
 * @param {Object} withdrawalData - The withdrawal information
 * @returns {Object|null} - The withdrawal record or null if error
 */
function withdrawItem(withdrawalData) {
    const item = getItem(withdrawalData.itemId);

    if (!item) {
        showNotification('Item not found.', 'error');
        return null;
    }

    const quantity = parseInt(withdrawalData.quantity);

    // Validate sufficient stock
    if (quantity > item.quantity) {
        showNotification('Insufficient stock. Available: ' + item.quantity, 'error');
        return null;
    }

    // Calculate total cost
    const totalCost = quantity * item.unitCost;

    // Create withdrawal record (capturing current cost for historical accuracy)
    const withdrawal = {
        id: 'withdraw_' + Date.now(),
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        quantity: quantity,
        unitCost: item.unitCost,
        totalCost: totalCost,
        date: new Date().toISOString(),
        notes: withdrawalData.notes || ''
    };

    // Save withdrawal record
    const withdrawals = loadFromLocalStorage(STORAGE_KEYS.WITHDRAWALS, []);
    withdrawals.push(withdrawal);
    saveToLocalStorage(STORAGE_KEYS.WITHDRAWALS, withdrawals);

    // Update item quantity
    updateItem(item.id, {
        ...item,
        quantity: item.quantity - quantity
    });

    return withdrawal;
}

/**
 * Gets all withdrawal records
 * @returns {Array} - Array of all withdrawals
 */
function getAllWithdrawals() {
    return loadFromLocalStorage(STORAGE_KEYS.WITHDRAWALS, []);
}

/**
 * Filters withdrawals by date range
 * @param {string} startDate - ISO date string for start
 * @param {string} endDate - ISO date string for end
 * @returns {Array} - Filtered withdrawals
 */
function getWithdrawalsByDateRange(startDate, endDate) {
    const withdrawals = getAllWithdrawals();

    return withdrawals.filter(w => {
        const wDate = new Date(w.date);
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date('2100-12-31');

        // Set end date to end of day
        end.setHours(23, 59, 59, 999);

        return wDate >= start && wDate <= end;
    });
}

/**
 * Filters withdrawals by category
 * @param {string} category - Category name
 * @returns {Array} - Filtered withdrawals
 */
function getWithdrawalsByCategory(category) {
    const withdrawals = getAllWithdrawals();
    return withdrawals.filter(w => w.category === category);
}

// ============================================
// UI RENDERING FUNCTIONS
// ============================================

/**
 * Renders the inventory table
 */
function renderInventoryTable() {
    const items = getAllItems();
    const tbody = document.getElementById('inventoryTableBody');
    const emptyMessage = document.getElementById('emptyInventoryMessage');
    const table = document.getElementById('inventoryTable');

    // Show empty message if no items
    if (items.length === 0) {
        table.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyMessage.style.display = 'none';

    // Filter items based on search
    const searchTerm = document.getElementById('searchInventory').value.toLowerCase();
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
    );

    // Clear existing rows
    tbody.innerHTML = '';

    // Create a row for each item
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        const totalValue = item.quantity * item.unitCost;

        row.innerHTML = `
            <td data-label="Item Name">${escapeHtml(item.name)}</td>
            <td data-label="Category">${escapeHtml(item.category)}</td>
            <td data-label="Quantity">${item.quantity}</td>
            <td data-label="Unit Cost">${formatCurrency(item.unitCost)}</td>
            <td data-label="Total Value">${formatCurrency(totalValue)}</td>
            <td data-label="Actions">
                <div class="actions">
                    <button class="btn-primary btn-small" onclick="openEditModal('${item.id}')">Edit</button>
                    <button class="btn-danger btn-small" onclick="confirmDeleteItem('${item.id}')">Delete</button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Renders category dropdowns throughout the app
 */
function renderCategoryDropdowns() {
    const categories = getAllCategories();

    // Render in add item form
    const addCategorySelect = document.getElementById('itemCategory');
    addCategorySelect.innerHTML = categories.map(cat =>
        `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
    ).join('');

    // Render in edit form
    const editCategorySelect = document.getElementById('editItemCategory');
    editCategorySelect.innerHTML = categories.map(cat =>
        `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
    ).join('');

    // Render in reports filter
    const filterCategorySelect = document.getElementById('filterCategory');
    filterCategorySelect.innerHTML = '<option value="">All Categories</option>' +
        categories.map(cat =>
            `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
        ).join('');
}

/**
 * Renders the category list in the management modal
 */
function renderCategoryList() {
    const categories = getAllCategories();
    const categoryList = document.getElementById('categoryList');

    categoryList.innerHTML = categories.map(cat => `
        <li>
            <span>${escapeHtml(cat)}</span>
            <button class="btn-danger btn-small" onclick="confirmDeleteCategory('${escapeHtml(cat)}')">Delete</button>
        </li>
    `).join('');
}

/**
 * Renders the withdrawal form (item dropdown)
 */
function renderWithdrawalForm() {
    const items = getAllItems();
    const select = document.getElementById('withdrawItem');

    // Filter out items with zero quantity
    const availableItems = items.filter(item => item.quantity > 0);

    select.innerHTML = '<option value="">-- Select an item --</option>' +
        availableItems.map(item =>
            `<option value="${item.id}">${escapeHtml(item.name)} (Available: ${item.quantity})</option>`
        ).join('');

    // Hide details until item is selected
    document.getElementById('withdrawDetails').style.display = 'none';
}

/**
 * Updates the withdrawal preview when item or quantity changes
 */
function updateWithdrawPreview() {
    const itemId = document.getElementById('withdrawItem').value;
    const quantityInput = document.getElementById('withdrawQuantity');
    const detailsDiv = document.getElementById('withdrawDetails');

    if (!itemId) {
        detailsDiv.style.display = 'none';
        return;
    }

    detailsDiv.style.display = 'block';

    const item = getItem(itemId);
    if (!item) return;

    // Display current stock and unit cost
    document.getElementById('currentStock').textContent = item.quantity;
    document.getElementById('displayUnitCost').textContent = formatCurrency(item.unitCost);

    // Calculate and display cost preview
    const quantity = parseInt(quantityInput.value) || 0;
    const totalCost = quantity * item.unitCost;
    document.getElementById('costPreview').textContent = formatCurrency(totalCost);

    // Set max quantity
    quantityInput.max = item.quantity;

    // Enable/disable withdraw button
    const withdrawButton = document.getElementById('withdrawButton');
    withdrawButton.disabled = quantity <= 0 || quantity > item.quantity;
}

/**
 * Generates and renders the reports
 * @param {Object} filters - Filter criteria
 */
function generateReport(filters = {}) {
    let withdrawals = getAllWithdrawals();

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
        withdrawals = getWithdrawalsByDateRange(filters.startDate, filters.endDate);
    }

    // Apply category filter
    if (filters.category) {
        withdrawals = withdrawals.filter(w => w.category === filters.category);
    }

    // Render statistics
    renderStatistics(withdrawals);

    // Render withdrawal history table
    renderWithdrawalHistory(withdrawals);
}

/**
 * Renders statistics cards
 * @param {Array} withdrawals - Filtered withdrawals
 */
function renderStatistics(withdrawals) {
    const statsGrid = document.getElementById('statsGrid');

    if (withdrawals.length === 0) {
        statsGrid.innerHTML = '<p class="empty-message">No data available for the selected filters.</p>';
        return;
    }

    // Calculate statistics
    const totalWithdrawals = withdrawals.length;
    const totalCost = withdrawals.reduce((sum, w) => sum + w.totalCost, 0);
    const totalQuantity = withdrawals.reduce((sum, w) => sum + w.quantity, 0);
    const avgCost = totalCost / totalWithdrawals;

    // Find most withdrawn item
    const itemCounts = {};
    withdrawals.forEach(w => {
        itemCounts[w.itemName] = (itemCounts[w.itemName] || 0) + w.quantity;
    });
    const mostWithdrawn = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];

    // Render cards
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Withdrawals</div>
            <div class="stat-value">${totalWithdrawals}</div>
        </div>
        <div class="stat-card success">
            <div class="stat-label">Total Cost</div>
            <div class="stat-value">${formatCurrency(totalCost)}</div>
        </div>
        <div class="stat-card warning">
            <div class="stat-label">Items Withdrawn</div>
            <div class="stat-value">${totalQuantity}</div>
        </div>
        <div class="stat-card info">
            <div class="stat-label">Average Cost</div>
            <div class="stat-value">${formatCurrency(avgCost)}</div>
        </div>
        ${mostWithdrawn ? `
        <div class="stat-card">
            <div class="stat-label">Most Withdrawn</div>
            <div class="stat-value" style="font-size: 1rem;">${escapeHtml(mostWithdrawn[0])} (${mostWithdrawn[1]})</div>
        </div>
        ` : ''}
    `;
}

/**
 * Renders the withdrawal history table
 * @param {Array} withdrawals - Filtered withdrawals
 */
function renderWithdrawalHistory(withdrawals) {
    const tbody = document.getElementById('withdrawalTableBody');
    const emptyMessage = document.getElementById('emptyReportsMessage');
    const table = document.getElementById('withdrawalTable');

    if (withdrawals.length === 0) {
        table.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyMessage.style.display = 'none';

    // Sort by date (newest first)
    const sortedWithdrawals = [...withdrawals].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    tbody.innerHTML = sortedWithdrawals.map(w => `
        <tr>
            <td data-label="Date">${formatDate(w.date)}</td>
            <td data-label="Item">${escapeHtml(w.itemName)}</td>
            <td data-label="Category">${escapeHtml(w.category)}</td>
            <td data-label="Quantity">${w.quantity}</td>
            <td data-label="Unit Cost">${formatCurrency(w.unitCost)}</td>
            <td data-label="Total Cost">${formatCurrency(w.totalCost)}</td>
            <td data-label="Notes">${escapeHtml(w.notes || '-')}</td>
        </tr>
    `).join('');
}

// ============================================
// MODAL FUNCTIONS
// ============================================

/**
 * Opens a modal
 * @param {string} modalId - The modal element ID
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
}

/**
 * Closes a modal
 * @param {string} modalId - The modal element ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

/**
 * Opens the edit modal with item data
 * @param {string} itemId - The item ID to edit
 */
function openEditModal(itemId) {
    const item = getItem(itemId);
    if (!item) return;

    // Populate form fields
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemCategory').value = item.category;
    document.getElementById('editItemQuantity').value = item.quantity;
    document.getElementById('editItemCost').value = item.unitCost;
    document.getElementById('editItemDescription').value = item.description;

    openModal('editModal');
}

/**
 * Shows a confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Function} callback - Function to call on confirm
 */
function showConfirmDialog(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    openModal('confirmModal');
}

/**
 * Confirms deletion of an item
 * @param {string} itemId - The item ID to delete
 */
function confirmDeleteItem(itemId) {
    const item = getItem(itemId);
    if (!item) return;

    showConfirmDialog(
        'Delete Item',
        `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
        () => {
            if (deleteItem(itemId)) {
                showNotification('Item deleted successfully.', 'success');
                renderInventoryTable();
                renderWithdrawalForm(); // Update withdrawal dropdown
            } else {
                showNotification('Failed to delete item.', 'error');
            }
        }
    );
}

/**
 * Confirms deletion of a category
 * @param {string} categoryName - The category name to delete
 */
function confirmDeleteCategory(categoryName) {
    showConfirmDialog(
        'Delete Category',
        `Are you sure you want to delete the category "${categoryName}"?`,
        () => {
            if (deleteCategory(categoryName)) {
                showNotification('Category deleted successfully.', 'success');
                renderCategoryList();
                renderCategoryDropdowns();
            }
        }
    );
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

/**
 * Shows a notification toast
 * @param {string} message - The message to display
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    notification.innerHTML = `
        <span class="notification-icon">${icons[type]}</span>
        <span class="notification-message">${escapeHtml(message)}</span>
    `;

    container.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 3000);
}

// ============================================
// TAB SWITCHING
// ============================================

/**
 * Switches to a different tab
 * @param {string} tabName - The tab to switch to
 */
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');

    // Highlight selected button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Refresh content if needed
    if (tabName === 'reports') {
        generateReport();
    } else if (tabName === 'withdraw') {
        renderWithdrawalForm();
    } else if (tabName === 'inventory') {
        renderInventoryTable();
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handles add item form submission
 */
function handleAddItem(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('itemName').value.trim(),
        category: document.getElementById('itemCategory').value,
        quantity: document.getElementById('itemQuantity').value,
        unitCost: document.getElementById('itemCost').value,
        description: document.getElementById('itemDescription').value.trim()
    };

    // Validate
    if (!formData.name) {
        showNotification('Please enter an item name.', 'error');
        return;
    }

    if (formData.quantity < 0) {
        showNotification('Quantity cannot be negative.', 'error');
        return;
    }

    if (formData.unitCost < 0) {
        showNotification('Unit cost cannot be negative.', 'error');
        return;
    }

    // Add item
    const item = addItem(formData);

    if (item) {
        showNotification(`"${item.name}" added successfully!`, 'success');

        // Clear form
        document.getElementById('addItemForm').reset();

        // Re-render inventory
        renderInventoryTable();

        // Update withdrawal dropdown
        renderWithdrawalForm();
    } else {
        showNotification('Failed to add item.', 'error');
    }
}

/**
 * Handles edit item form submission
 */
function handleEditItem(event) {
    event.preventDefault();

    const itemId = document.getElementById('editItemId').value;
    const updates = {
        name: document.getElementById('editItemName').value.trim(),
        category: document.getElementById('editItemCategory').value,
        quantity: document.getElementById('editItemQuantity').value,
        unitCost: document.getElementById('editItemCost').value,
        description: document.getElementById('editItemDescription').value.trim()
    };

    if (updateItem(itemId, updates)) {
        showNotification('Item updated successfully!', 'success');
        closeModal('editModal');
        renderInventoryTable();
        renderWithdrawalForm();
    } else {
        showNotification('Failed to update item.', 'error');
    }
}

/**
 * Handles withdrawal form submission
 */
function handleWithdraw(event) {
    event.preventDefault();

    const withdrawalData = {
        itemId: document.getElementById('withdrawItem').value,
        quantity: document.getElementById('withdrawQuantity').value,
        notes: document.getElementById('withdrawNotes').value.trim()
    };

    if (!withdrawalData.itemId) {
        showNotification('Please select an item.', 'error');
        return;
    }

    const withdrawal = withdrawItem(withdrawalData);

    if (withdrawal) {
        showNotification(
            `Withdrawn ${withdrawal.quantity} × ${withdrawal.itemName} - Total: ${formatCurrency(withdrawal.totalCost)}`,
            'success'
        );

        // Reset form
        document.getElementById('withdrawForm').reset();
        document.getElementById('withdrawDetails').style.display = 'none';

        // Update inventory display
        renderInventoryTable();
        renderWithdrawalForm();
    }
}

/**
 * Handles add category form submission
 */
function handleAddCategory(event) {
    event.preventDefault();

    const categoryName = document.getElementById('newCategoryName').value.trim();

    if (!categoryName) {
        showNotification('Please enter a category name.', 'error');
        return;
    }

    if (addCategory(categoryName)) {
        showNotification(`Category "${categoryName}" added successfully!`, 'success');
        document.getElementById('addCategoryForm').reset();
        renderCategoryList();
        renderCategoryDropdowns();
    } else {
        showNotification('Category already exists.', 'warning');
    }
}

/**
 * Handles report filter form submission
 */
function handleGenerateReport(event) {
    event.preventDefault();

    const filters = {
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
        category: document.getElementById('filterCategory').value
    };

    generateReport(filters);
}

/**
 * Handles confirmation button click
 */
function handleConfirm() {
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
    closeModal('confirmModal');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Formats a number as currency
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Formats an ISO date string to readable format
 * @param {string} isoString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Updates the current date display in header
 */
function updateCurrentDate() {
    const dateDisplay = document.getElementById('currentDate');
    const now = new Date();
    dateDisplay.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => showTab(e.target.dataset.tab));
    });

    // Add item form
    document.getElementById('addItemForm').addEventListener('submit', handleAddItem);

    // Edit item form
    document.getElementById('editItemForm').addEventListener('submit', handleEditItem);

    // Withdraw form
    document.getElementById('withdrawForm').addEventListener('submit', handleWithdraw);
    document.getElementById('withdrawItem').addEventListener('change', updateWithdrawPreview);
    document.getElementById('withdrawQuantity').addEventListener('input', updateWithdrawPreview);

    // Add category form
    document.getElementById('addCategoryForm').addEventListener('submit', handleAddCategory);

    // Report filters
    document.getElementById('reportFilters').addEventListener('submit', handleGenerateReport);

    // Manage categories button
    document.getElementById('manageCategoriesBtn').addEventListener('click', () => {
        renderCategoryList();
        openModal('categoryModal');
    });

    // Search inventory
    document.getElementById('searchInventory').addEventListener('input', renderInventoryTable);

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            closeModal(modalId);
        });
    });

    // Modal cancel buttons
    document.querySelectorAll('[data-modal]').forEach(btn => {
        if (btn.classList.contains('btn-secondary')) {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                closeModal(modalId);
            });
        }
    });

    // Confirm button
    document.getElementById('confirmButton').addEventListener('click', handleConfirm);

    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initializes the application
 */
function init() {
    // Initialize storage
    initializeStorage();

    // Setup event listeners
    setupEventListeners();

    // Render initial views
    renderCategoryDropdowns();
    renderInventoryTable();
    updateCurrentDate();

    // Update date every minute
    setInterval(updateCurrentDate, 60000);

    console.log('Inventory Tracker initialized successfully!');
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);
