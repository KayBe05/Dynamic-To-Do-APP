class TodoApp {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.currentSort = 'date-added';
        this.searchQuery = '';
        this.editingTaskId = null;
        this.draggedTaskId = null;

        this.initializeElements();
        this.attachEventListeners();
        this.initializeTheme();
        this.render();
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
        // Add task form
        this.addTaskForm?.addEventListener('submit', (e) => this.handleAddTask(e));

        // Search and filter
        this.searchInput?.addEventListener('input', (e) => this.handleSearch(e));
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    initializeTheme() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('todoAppTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('theme-dark');
            this.updateThemeIcon(true);
        }
    }

    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.toggle('theme-dark');

        // Save theme preference
        localStorage.setItem('todoAppTheme', isDark ? 'dark' : 'light');

        // Update icon
        this.updateThemeIcon(isDark);

        // Add rotation animation
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

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadTasks() {
        try {
            const tasks = localStorage.getItem('todoTasks');
            const parsedTasks = tasks ? JSON.parse(tasks) : [];

            // Ensure all tasks have required properties
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
            console.error('Error loading tasks:', error);
            return [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showNotification('Error saving tasks. Please check your browser settings.', 'error');
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element if it doesn't exist
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
        }, 3000);
    }

    handleAddTask(e) {
        e.preventDefault();

        const text = this.taskInput?.value?.trim();
        if (!text) {
            this.showNotification('Please enter a task title', 'error');
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

        this.tasks.unshift(task);
        this.saveTasks();
        this.render();

        // Reset form
        if (this.taskInput) this.taskInput.value = '';
        if (this.taskDescription) this.taskDescription.value = '';
        if (this.dueDateInput) this.dueDateInput.value = '';
        if (this.prioritySelect) this.prioritySelect.value = 'medium';

        // Focus back to input
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

    handleSearch(e) {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
    }

    handleFilter(e) {
        this.filterButtons?.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.render();
    }

    handleSort(e) {
        this.currentSort = e.target.value;
        this.render();
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.render();

            const status = task.completed ? 'completed' : 'marked as active';
            this.showNotification(`Task ${status}!`);
        }
    }

    deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.render();
            this.showNotification('Task deleted successfully!');
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.editingTaskId = taskId;
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
        if (!text) {
            this.showNotification('Please enter a task title', 'error');
            return;
        }

        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (task) {
            task.text = text;
            task.description = this.editTaskDescription?.value?.trim() || '';
            task.priority = this.editPrioritySelect?.value || 'medium';
            task.dueDate = this.editDueDateInput?.value || null;
            this.saveTasks();
            this.render();
            this.closeEditModal();
            this.showNotification('Task updated successfully!');
        }
    }

    closeEditModal() {
        if (this.editModal) {
            this.editModal.style.display = 'none';
        }
        this.editingTaskId = null;
    }

    clearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showNotification('No completed tasks to clear.', 'info');
            return;
        }

        if (confirm(`Are you sure you want to delete ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`)) {
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.render();
            this.showNotification(`${completedCount} completed task${completedCount > 1 ? 's' : ''} cleared!`);
        }
    }

    markAllComplete() {
        const incompleteCount = this.tasks.filter(t => !t.completed).length;
        if (incompleteCount === 0) {
            this.showNotification('All tasks are already completed.', 'info');
            return;
        }

        this.tasks.forEach(task => {
            if (!task.completed) {
                task.completed = true;
                task.completedAt = new Date().toISOString();
            }
        });
        this.saveTasks();
        this.render();
        this.showNotification(`${incompleteCount} task${incompleteCount > 1 ? 's' : ''} marked as complete!`);
    }

    getFilteredTasks() {
        let filtered = this.tasks;

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(task =>
                task.text.toLowerCase().includes(this.searchQuery) ||
                (task.description && task.description.toLowerCase().includes(this.searchQuery))
            );
        }

        // Apply status filter
        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
        }

        // Apply sorting
        switch (this.currentSort) {
            case 'priority':
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                filtered.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                });
                break;
            case 'due-date':
                filtered.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case 'alphabetical':
                filtered.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
                });
                break;
            case 'custom':
                filtered.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return a.order - b.order;
                });
                break;
            case 'date-added':
            default:
                filtered.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                break;
        }

        return filtered;
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

    handleDragStart(e, taskId) {
        this.draggedTaskId = taskId;
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1';
        this.draggedTaskId = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e, targetTaskId) {
        e.preventDefault();

        if (this.draggedTaskId && this.draggedTaskId !== targetTaskId) {
            const draggedTask = this.tasks.find(t => t.id === this.draggedTaskId);
            const targetTask = this.tasks.find(t => t.id === targetTaskId);

            if (draggedTask && targetTask) {
                const tempOrder = draggedTask.order;
                draggedTask.order = targetTask.order;
                targetTask.order = tempOrder;

                this.saveTasks();
                this.render();
                this.showNotification('Task order updated!');
            }
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

        // Add drag event listeners
        li.addEventListener('dragstart', (e) => this.handleDragStart(e, task.id));
        li.addEventListener('dragend', (e) => this.handleDragEnd(e));
        li.addEventListener('dragover', (e) => this.handleDragOver(e));
        li.addEventListener('drop', (e) => this.handleDrop(e, task.id));

        return li;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const active = total - completed;

        if (this.totalTasksSpan) this.totalTasksSpan.textContent = total;
        if (this.activeTasksSpan) this.activeTasksSpan.textContent = active;
        if (this.completedTasksSpan) this.completedTasksSpan.textContent = completed;
    }

    render() {
        const filteredTasks = this.getFilteredTasks();

        // Clear task list
        if (this.taskList) {
            this.taskList.innerHTML = '';
        }

        // Show/hide empty state
        if (filteredTasks.length === 0) {
            if (this.emptyState) this.emptyState.style.display = 'block';
            if (this.taskList) this.taskList.style.display = 'none';
        } else {
            if (this.emptyState) this.emptyState.style.display = 'none';
            if (this.taskList) this.taskList.style.display = 'block';

            // Add tasks to list
            filteredTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                this.taskList?.appendChild(taskElement);
            });
        }

        // Update stats
        this.updateStats();

        // Update bulk action button states
        const completedCount = this.tasks.filter(t => t.completed).length;
        const activeCount = this.tasks.filter(t => !t.completed).length;

        if (this.clearCompletedBtn) this.clearCompletedBtn.disabled = completedCount === 0;
        if (this.markAllCompleteBtn) this.markAllCompleteBtn.disabled = activeCount === 0;
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to add task
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (document.activeElement === this.taskInput) {
                this.addTaskForm?.dispatchEvent(new Event('submit'));
            }
        }

        // Escape to close modal
        if (e.key === 'Escape' && this.editModal?.style.display === 'block') {
            this.closeEditModal();
        }

        // Enter to save edit in modal
        if (e.key === 'Enter' && this.editModal?.style.display === 'block') {
            if (document.activeElement !== this.editTaskInput) {
                this.saveTaskEdit();
            }
        }

        // Focus search with Ctrl/Cmd + F
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.searchInput?.focus();
        }

        // Toggle theme with Ctrl/Cmd + D
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.toggleTheme();
        }
    }

    // Export tasks to JSON
    exportTasks() {
        if (this.tasks.length === 0) {
            this.showNotification('No tasks to export!', 'info');
            return;
        }

        const exportData = {
            tasks: this.tasks,
            exportDate: new Date().toISOString(),
            version: '1.0'
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

    // Import tasks from JSON
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
                    // Direct array of tasks
                    importedTasks = importedData;
                } else if (importedData.tasks && Array.isArray(importedData.tasks)) {
                    // Object with tasks property
                    importedTasks = importedData.tasks;
                } else {
                    this.showNotification('Invalid file format', 'error');
                    return;
                }

                if (importedTasks.length === 0) {
                    this.showNotification('No tasks found in file', 'info');
                    return;
                }

                const action = this.tasks.length > 0
                    ? confirm(`Import ${importedTasks.length} tasks? Choose:\nOK = Replace all current tasks\nCancel = Merge with current tasks`)
                    : true;

                if (action === null) return; // User cancelled

                if (action) {
                    // Replace all tasks
                    this.tasks = importedTasks.map(task => ({
                        ...task,
                        id: task.id || this.generateId(),
                        order: task.order !== undefined ? task.order : Date.now()
                    }));
                } else {
                    // Merge tasks
                    const newTasks = importedTasks.map(task => ({
                        ...task,
                        id: this.generateId(), // Always generate new ID for merged tasks
                        order: task.order !== undefined ? task.order : Date.now()
                    }));
                    this.tasks = [...this.tasks, ...newTasks];
                }

                this.saveTasks();
                this.render();
                this.showNotification(`${importedTasks.length} tasks imported successfully!`);

                // Clear the file input
                event.target.value = '';

            } catch (error) {
                console.error('Import error:', error);
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