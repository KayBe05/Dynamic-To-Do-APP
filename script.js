class TodoApp {
    constructor() {
        // Configuration for better maintainability
        this.config = {
            maxTaskLength: 200,
            maxDescriptionLength: 500,
            autoSaveDelay: 300,
            notificationDuration: 3000,
            animationDuration: 300
        };

        // Enhanced state management
        this.state = {
            tasks: this.loadTasks(),
            currentFilter: 'all',
            currentSort: 'date-added',
            searchQuery: '',
            editingTaskId: null,
            draggedTaskId: null,
            isLoading: false,
            hasUnsavedChanges: false
        };

        // Bound handlers for better performance
        this.boundHandlers = {
            search: this.debounce(this.handleSearch.bind(this), 300),
            autoSave: this.debounce(this.autoSave.bind(this), this.config.autoSaveDelay)
        };

        this.initialize();
    }

    async initialize() {
        try {
            this.initializeElements();
            this.attachEventListeners();
            this.initializeTheme();
            this.setupAutoSave();
            this.setupKeyboardShortcuts();
            this.render();
        } catch (error) {
            this.handleError(error, 'INITIALIZATION');
        }
    }

    // Enhanced error handling
    handleError(error, context = 'GENERAL') {
        console.error(`[TodoApp - ${context}]:`, error);

        const errorMessages = {
            'STORAGE': 'Failed to save data. Please check your browser settings.',
            'VALIDATION': 'Invalid input. Please check your entries.',
            'INITIALIZATION': 'App failed to load. Please refresh the page.',
            'TASK_OPERATION': 'Task operation failed. Please try again.'
        };

        const userMessage = errorMessages[context] || 'An unexpected error occurred.';
        this.showNotification(userMessage, 'error');
    }

    // Input validation with detailed feedback
    validateTaskInput(input) {
        const errors = [];

        if (!input || !input.trim()) {
            errors.push('Task title is required');
        }

        if (input && input.length > this.config.maxTaskLength) {
            errors.push(`Task title too long (max ${this.config.maxTaskLength} characters)`);
        }

        // Check for potentially harmful content
        const harmfulPatterns = [/<script/i, /javascript:/i, /onclick/i];
        if (harmfulPatterns.some(pattern => pattern.test(input))) {
            errors.push('Invalid characters detected');
        }

        return { errors, isValid: errors.length === 0 };
    }

    // Performance utilities
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    initializeElements() {
        // Form elements
        this.addTaskForm = document.getElementById('add-task-form');
        this.taskInput = document.getElementById('task-input');
        this.taskDescription = document.getElementById('task-description');
        this.prioritySelect = document.getElementById('priority-select');
        this.dueDateInput = document.getElementById('due-date');

        // Control elements
        this.searchInput = document.getElementById('search-input');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.sortSelect = document.getElementById('sort-select');

        // Display elements
        this.taskList = document.getElementById('task-list');
        this.emptyState = document.getElementById('empty-state');
        this.totalTasksSpan = document.getElementById('total-tasks');
        this.activeTasksSpan = document.getElementById('active-tasks');
        this.completedTasksSpan = document.getElementById('completed-tasks');

        // Bulk action elements
        this.clearCompletedBtn = document.getElementById('clear-completed');
        this.markAllCompleteBtn = document.getElementById('mark-all-complete');

        // Modal elements
        this.editModal = document.getElementById('edit-modal');
        this.editTaskInput = document.getElementById('edit-task-input');
        this.editTaskDescription = document.getElementById('edit-task-description');
        this.editPrioritySelect = document.getElementById('edit-priority-select');
        this.editDueDateInput = document.getElementById('edit-due-date');
        this.closeModalBtn = document.getElementById('close-modal');
        this.cancelEditBtn = document.getElementById('cancel-edit');
        this.saveEditBtn = document.getElementById('save-edit');

        // Theme and utility elements
        this.themeToggle = document.getElementById('theme-toggle');
        this.exportBtn = document.getElementById('export-btn');
        this.importBtn = document.getElementById('import-btn');
        this.importInput = document.getElementById('import-input');
    }

    attachEventListeners() {
        // Add task form with validation
        this.addTaskForm?.addEventListener('submit', (e) => this.handleAddTask(e));

        // Enhanced search with debouncing
        this.searchInput?.addEventListener('input', this.boundHandlers.search);

        this.filterButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });
        this.sortSelect?.addEventListener('change', (e) => this.handleSort(e));

        // Bulk actions
        this.clearCompletedBtn?.addEventListener('click', () => this.clearCompleted());
        this.markAllCompleteBtn?.addEventListener('click', () => this.markAllComplete());

        // Modal events
        this.closeModalBtn?.addEventListener('click', () => this.closeEditModal());
        this.cancelEditBtn?.addEventListener('click', () => this.closeEditModal());
        this.saveEditBtn?.addEventListener('click', () => this.saveTaskEdit());

        // Close modal on backdrop click
        this.editModal?.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.closeEditModal();
            }
        });

        // Theme toggle
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());

        // Export/Import functionality
        this.exportBtn?.addEventListener('click', () => this.handleExportClick());
        this.importBtn?.addEventListener('click', () => this.handleImportClick());
        this.importInput?.addEventListener('change', (e) => this.importTasks(e));

        // Enhanced drag and drop
        this.initializeDragAndDrop();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('todoAppTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('theme-dark');
            this.updateThemeIcon(true);
        }
    }

    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.toggle('theme-dark');

        localStorage.setItem('todoAppTheme', isDark ? 'dark' : 'light');
        this.updateThemeIcon(isDark);

        if (this.themeToggle) {
            this.themeToggle.classList.add('theme-toggle-animation');
            setTimeout(() => {
                this.themeToggle.classList.remove('theme-toggle-animation');
            }, 500);
        }

        this.showNotification(`${isDark ? 'Dark' : 'Light'} theme activated!`);
    }

    updateThemeIcon(isDark) {
        const icon = this.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Auto-save functionality
    setupAutoSave() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state.hasUnsavedChanges) {
                this.saveTasks();
            }
        });

        // Handle beforeunload
        window.addEventListener('beforeunload', (e) => {
            if (this.state.hasUnsavedChanges) {
                this.saveTasks();
            }
        });
    }

    autoSave() {
        if (this.state.hasUnsavedChanges) {
            this.saveTasks();
            this.state.hasUnsavedChanges = false;
        }
    }

    markAsChanged() {
        this.state.hasUnsavedChanges = true;
        this.boundHandlers.autoSave();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadTasks() {
        try {
            const tasks = localStorage.getItem('todoTasks');
            const parsedTasks = tasks ? JSON.parse(tasks) : [];

            return parsedTasks.map(task => ({
                id: task.id || this.generateId(),
                text: task.text || '',
                description: task.description || '',
                completed: task.completed || false,
                priority: task.priority || 'medium',
                dueDate: task.dueDate || null,
                createdAt: task.createdAt || new Date().toISOString(),
                completedAt: task.completedAt || null,
                order: task.order !== undefined ? task.order : Date.now()
            }));
        } catch (error) {
            this.handleError(error, 'STORAGE');
            return [];
        }
    }

    saveTasks() {
        try {
            const data = {
                tasks: this.state.tasks,
                metadata: {
                    version: '2.0',
                    timestamp: new Date().toISOString(),
                    totalTasks: this.state.tasks.length
                }
            };

            localStorage.setItem('todoTasks', JSON.stringify(data.tasks));
            this.state.hasUnsavedChanges = false;
        } catch (error) {
            this.handleError(error, 'STORAGE');
        }
    }

    showNotification(message, type = 'success') {
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, this.config.notificationDuration);
    }

    handleAddTask(e) {
        e.preventDefault();

        const text = this.taskInput?.value?.trim();
        const validation = this.validateTaskInput(text);

        if (!validation.isValid) {
            this.showNotification(validation.errors[0], 'error');
            return;
        }

        const task = {
            id: this.generateId(),
            text: text,
            description: this.taskDescription?.value?.trim() || '',
            completed: false,
            priority: this.prioritySelect?.value || 'medium',
            dueDate: this.dueDateInput?.value || null,
            createdAt: new Date().toISOString(),
            completedAt: null,
            order: Date.now()
        };

        this.state.tasks.unshift(task);
        this.markAsChanged();
        this.render();

        // Reset form
        this.resetForm();
        this.taskInput?.focus();

        this.showNotification('Task added successfully!');

        // Add animation
        setTimeout(() => {
            const taskElement = this.taskList?.firstElementChild;
            if (taskElement) {
                taskElement.classList.add('slide-in');
            }
        }, 10);
    }

    resetForm() {
        if (this.taskInput) this.taskInput.value = '';
        if (this.taskDescription) this.taskDescription.value = '';
        if (this.dueDateInput) this.dueDateInput.value = '';
        if (this.prioritySelect) this.prioritySelect.value = 'medium';
    }

    handleSearch(e) {
        this.state.searchQuery = e.target.value.toLowerCase();
        this.render();
    }

    handleFilter(e) {
        this.filterButtons?.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.state.currentFilter = e.target.dataset.filter;
        this.render();
    }

    handleSort(e) {
        this.state.currentSort = e.target.value;
        this.render();
    }

    toggleTask(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.markAsChanged();
            this.render();

            const status = task.completed ? 'completed' : 'marked as active';
            this.showNotification(`Task ${status}!`);
        }
    }

    deleteTask(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task && confirm('Are you sure you want to delete this task?')) {
            this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
            this.markAsChanged();
            this.render();
            this.showNotification('Task deleted successfully!');
        }
    }

    editTask(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (task) {
            this.state.editingTaskId = taskId;
            if (this.editTaskInput) this.editTaskInput.value = task.text;
            if (this.editTaskDescription) this.editTaskDescription.value = task.description || '';
            if (this.editPrioritySelect) this.editPrioritySelect.value = task.priority;
            if (this.editDueDateInput) this.editDueDateInput.value = task.dueDate || '';

            if (this.editModal) {
                this.editModal.style.display = 'block';
                this.editTaskInput?.focus();
            }
        }
    }

    saveTaskEdit() {
        const text = this.editTaskInput?.value?.trim();
        const validation = this.validateTaskInput(text);

        if (!validation.isValid) {
            this.showNotification(validation.errors[0], 'error');
            return;
        }

        const task = this.state.tasks.find(t => t.id === this.state.editingTaskId);
        if (task) {
            task.text = text;
            task.description = this.editTaskDescription?.value?.trim() || '';
            task.priority = this.editPrioritySelect?.value || 'medium';
            task.dueDate = this.editDueDateInput?.value || null;
            this.markAsChanged();
            this.render();
            this.closeEditModal();
            this.showNotification('Task updated successfully!');
        }
    }

    closeEditModal() {
        if (this.editModal) {
            this.editModal.style.display = 'none';
        }
        this.state.editingTaskId = null;
    }

    clearCompleted() {
        const completedCount = this.state.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showNotification('No completed tasks to clear.', 'info');
            return;
        }

        if (confirm(`Are you sure you want to delete ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`)) {
            this.state.tasks = this.state.tasks.filter(t => !t.completed);
            this.markAsChanged();
            this.render();
            this.showNotification(`${completedCount} completed task${completedCount > 1 ? 's' : ''} cleared!`);
        }
    }

    markAllComplete() {
        const incompleteCount = this.state.tasks.filter(t => !t.completed).length;
        if (incompleteCount === 0) {
            this.showNotification('All tasks are already completed.', 'info');
            return;
        }

        this.state.tasks.forEach(task => {
            if (!task.completed) {
                task.completed = true;
                task.completedAt = new Date().toISOString();
            }
        });
        this.markAsChanged();
        this.render();
        this.showNotification(`${incompleteCount} task${incompleteCount > 1 ? 's' : ''} marked as complete!`);
    }

    getFilteredTasks() {
        let filtered = this.state.tasks;

        // Apply search filter with better matching
        if (this.state.searchQuery) {
            filtered = filtered.filter(task =>
                task.text.toLowerCase().includes(this.state.searchQuery) ||
                (task.description && task.description.toLowerCase().includes(this.state.searchQuery))
            );
        }

        // Apply status filter
        switch (this.state.currentFilter) {
            case 'active':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
        }

        // Apply sorting
        return this.sortTasks(filtered);
    }

    sortTasks(tasks) {
        return tasks.sort((a, b) => {
            // Always show incomplete tasks first
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            switch (this.state.currentSort) {
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'due-date':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'alphabetical':
                    return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
                case 'custom':
                    return a.order - b.order;
                case 'date-added':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString();
        }
    }

    isOverdue(dateString) {
        if (!dateString) return false;
        const dueDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }

    // Enhanced drag and drop with better UX
    initializeDragAndDrop() {
        if (!this.taskList) return;

        this.taskList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-item')) {
                this.state.draggedTaskId = e.target.dataset.taskId;
                e.target.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        this.taskList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('task-item')) {
                e.target.style.opacity = '1';
                this.state.draggedTaskId = null;
            }
        });

        this.taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        this.taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetTaskId = e.target.closest('.task-item')?.dataset.taskId;

            if (this.state.draggedTaskId && targetTaskId && this.state.draggedTaskId !== targetTaskId) {
                this.reorderTasks(this.state.draggedTaskId, targetTaskId);
            }
        });
    }

    reorderTasks(draggedId, targetId) {
        const draggedTask = this.state.tasks.find(t => t.id === draggedId);
        const targetTask = this.state.tasks.find(t => t.id === targetId);

        if (draggedTask && targetTask) {
            const tempOrder = draggedTask.order;
            draggedTask.order = targetTask.order;
            targetTask.order = tempOrder;

            this.markAsChanged();
            this.render();
            this.showNotification('Task order updated!');
        }
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.taskId = task.id;
        li.draggable = true;

        const dueDateFormatted = this.formatDate(task.dueDate);
        const isOverdue = !task.completed && this.isOverdue(task.dueDate);

        li.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="app.toggleTask('${task.id}')"></div>
            <div class="task-content">
                <div class="task-text">${this.escapeHtml(task.text)}</div>
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <span class="priority priority-${task.priority}">${task.priority}</span>
                    ${task.dueDate ? `<span class="due-date-info ${isOverdue ? 'overdue' : ''}">
                        ${isOverdue ? '⚠️ ' : '📅 '}${dueDateFormatted}
                    </span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn edit-btn" onclick="app.editTask('${task.id}')" title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="app.deleteTask('${task.id}')" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return li;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const total = this.state.tasks.length;
        const completed = this.state.tasks.filter(t => t.completed).length;
        const active = total - completed;

        if (this.totalTasksSpan) this.totalTasksSpan.textContent = total;
        if (this.activeTasksSpan) this.activeTasksSpan.textContent = active;
        if (this.completedTasksSpan) this.completedTasksSpan.textContent = completed;
    }

    // Optimized rendering with DocumentFragment
    render() {
        const filteredTasks = this.getFilteredTasks();

        if (!this.taskList) return;

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();

        // Clear task list
        this.taskList.innerHTML = '';

        // Show/hide empty state
        if (filteredTasks.length === 0) {
            if (this.emptyState) this.emptyState.style.display = 'block';
            if (this.taskList) this.taskList.style.display = 'none';
        } else {
            if (this.emptyState) this.emptyState.style.display = 'none';
            if (this.taskList) this.taskList.style.display = 'block';

            // Add tasks to fragment
            filteredTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                fragment.appendChild(taskElement);
            });

            // Add fragment to DOM in one operation
            this.taskList.appendChild(fragment);
        }

        this.updateStats();
        this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
        const completedCount = this.state.tasks.filter(t => t.completed).length;
        const activeCount = this.state.tasks.filter(t => !t.completed).length;

        if (this.clearCompletedBtn) this.clearCompletedBtn.disabled = completedCount === 0;
        if (this.markAllCompleteBtn) this.markAllCompleteBtn.disabled = activeCount === 0;
    }

    // Enhanced keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Still allow some shortcuts in inputs
                if (e.key === 'Escape' && this.editModal?.style.display === 'block') {
                    this.closeEditModal();
                }
                return;
            }

            switch (true) {
                case (e.ctrlKey || e.metaKey) && e.key === 'Enter':
                    e.preventDefault();
                    this.taskInput?.focus();
                    break;
                case (e.ctrlKey || e.metaKey) && e.key === 'f':
                    e.preventDefault();
                    this.searchInput?.focus();
                    break;
                case (e.ctrlKey || e.metaKey) && e.key === 'd':
                    e.preventDefault();
                    this.toggleTheme();
                    break;
                case e.key === 'Escape':
                    if (this.editModal?.style.display === 'block') {
                        this.closeEditModal();
                    }
                    break;
            }
        });
    }

    handleExportClick() {
        if (this.exportBtn) {
            this.exportBtn.classList.add('pulse');
            setTimeout(() => {
                this.exportBtn.classList.remove('pulse');
            }, 600);
        }
        this.exportTasks();
    }

    handleImportClick() {
        if (this.importBtn) {
            this.importBtn.classList.add('pulse');
            setTimeout(() => {
                this.importBtn.classList.remove('pulse');
            }, 600);
        }
        this.importInput?.click();
    }

    exportTasks() {
        if (this.state.tasks.length === 0) {
            this.showNotification('No tasks to export!', 'info');
            return;
        }

        const exportData = {
            tasks: this.state.tasks,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tasks_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Tasks exported successfully!');
    }

    importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                let importedTasks = [];

                // Handle different import formats
                if (Array.isArray(importedData)) {
                    importedTasks = importedData;
                } else if (importedData.tasks && Array.isArray(importedData.tasks)) {
                    importedTasks = importedData.tasks;
                } else {
                    this.showNotification('Invalid file format', 'error');
                    return;
                }

                if (importedTasks.length === 0) {
                    this.showNotification('No tasks found in file', 'info');
                    return;
                }

                const action = this.state.tasks.length > 0
                    ? confirm(`Import ${importedTasks.length} tasks? Choose:\nOK = Replace all current tasks\nCancel = Merge with current tasks`)
                    : true;

                if (action === null) return;

                if (action) {
                    this.state.tasks = importedTasks.map(task => ({
                        ...task,
                        id: task.id || this.generateId(),
                        order: task.order !== undefined ? task.order : Date.now()
                    }));
                } else {
                    const newTasks = importedTasks.map(task => ({
                        ...task,
                        id: this.generateId(),
                        order: task.order !== undefined ? task.order : Date.now()
                    }));
                    this.state.tasks = [...this.state.tasks, ...newTasks];
                }

                this.markAsChanged();
                this.render();
                this.showNotification(`${importedTasks.length} tasks imported successfully!`);

                event.target.value = '';

            } catch (error) {
                this.handleError(error, 'TASK_OPERATION');
                this.showNotification('Error importing tasks. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoApp;
}