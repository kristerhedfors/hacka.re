/**
 * MCP Command History Manager
 * 
 * Manages command history storage and UI for MCP servers
 */

window.MCPCommandHistory = (function() {
    // Dependencies
    let uiManager = null;
    let notificationHandler = null;
    
    /**
     * Initialize the command history manager
     * @param {Object} config - Configuration object
     * @param {Object} config.uiManager - UI manager instance
     * @param {Function} config.notificationHandler - Function to show notifications
     */
    function init(config) {
        uiManager = config.uiManager;
        notificationHandler = config.notificationHandler || console.log;
    }
    
    /**
     * Get command history from encrypted storage
     * @returns {Array} Array of command history entries
     */
    function getHistory() {
        try {
            const history = window.CoreStorageService?.getValue('mcp-command-history');
            return history || [];
        } catch (error) {
            console.error('[MCPCommandHistory] Failed to load command history:', error);
            return [];
        }
    }
    
    /**
     * Save command to history
     * @param {string} command - The command that was executed
     * @param {string} serverName - The generated server name
     * @param {string} mode - 'command' or 'json'
     */
    function saveCommand(command, serverName, mode = 'command') {
        try {
            const history = getHistory();
            
            // Create history entry
            const entry = {
                id: Date.now() + Math.random(),
                command: command,
                serverName: serverName,
                mode: mode,
                timestamp: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };
            
            // Check for duplicates and remove if exists
            const existingIndex = history.findIndex(h => h.command === command && h.mode === mode);
            if (existingIndex > -1) {
                // Update existing entry's lastUsed timestamp
                history[existingIndex].lastUsed = entry.lastUsed;
                history[existingIndex].serverName = serverName; // Update server name in case it changed
            } else {
                // Add new entry to beginning
                history.unshift(entry);
            }
            
            // Keep only last 20 entries
            if (history.length > 20) {
                history.splice(20);
            }
            
            // Save back to encrypted storage
            window.CoreStorageService?.setValue('mcp-command-history', history);
            
        } catch (error) {
            console.error('[MCPCommandHistory] Failed to save command to history:', error);
        }
    }
    
    /**
     * Delete command from history
     * @param {string|number} entryId - ID of the history entry to delete
     */
    function deleteEntry(entryId) {
        try {
            const history = getHistory();
            const filteredHistory = history.filter(entry => entry.id != entryId);
            window.CoreStorageService?.setValue('mcp-command-history', filteredHistory);
            updateHistoryDisplay();
            notificationHandler('Command removed from history', 'info');
        } catch (error) {
            console.error('[MCPCommandHistory] Failed to delete from history:', error);
            notificationHandler('Failed to delete from history', 'error');
        }
    }
    
    /**
     * Update the command history display
     */
    function updateHistoryDisplay() {
        const elements = uiManager.getElements();
        if (!elements.commandHistoryList) {
            return;
        }
        
        const history = getHistory();
        
        if (history.length === 0) {
            elements.commandHistoryList.innerHTML = `
                <div class="empty-history-state">
                    <p>No command history yet. Start a server to build your history.</p>
                </div>
            `;
            return;
        }
        
        // Clear existing content
        elements.commandHistoryList.innerHTML = '';
        
        // Sort by last used (most recent first)
        const sortedHistory = history.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
        
        sortedHistory.forEach(entry => {
            const historyItem = createHistoryItem(entry);
            elements.commandHistoryList.appendChild(historyItem);
        });
    }
    
    /**
     * Create a history item element
     * @param {Object} entry - History entry
     * @returns {HTMLElement} History item element
     */
    function createHistoryItem(entry) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        // Format timestamp
        const lastUsed = new Date(entry.lastUsed);
        const timeAgo = getTimeAgo(lastUsed);
        
        // Truncate long commands
        const displayCommand = entry.command.length > 80 
            ? entry.command.substring(0, 80) + '...' 
            : entry.command;
        
        historyItem.innerHTML = `
            <div class="history-item-info" onclick="MCPCommandHistory.startFromHistory(${JSON.stringify(entry).replace(/"/g, '&quot;')})">
                <div class="history-item-command">${displayCommand}</div>
                <div class="history-item-meta">
                    Server: ${entry.serverName} • Mode: ${entry.mode} • ${timeAgo}
                </div>
            </div>
            <div class="history-item-actions">
                <button class="btn danger-btn" onclick="MCPCommandHistory.confirmDelete('${entry.id}')" title="Delete from history">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return historyItem;
    }
    
    /**
     * Start command from history
     * @param {Object} historyEntry - The history entry to execute
     */
    async function startFromHistory(historyEntry) {
        try {
            // Update the form with the history entry
            const urlInput = document.getElementById('mcp-server-url');
            if (urlInput) {
                urlInput.value = historyEntry.command;
            }
            
            // Set the correct input mode
            const modeRadio = document.querySelector(`input[name="input-mode"][value="${historyEntry.mode}"]`);
            if (modeRadio) {
                modeRadio.checked = true;
                modeRadio.dispatchEvent(new Event('change'));
            }
            
            // Update last used timestamp
            const history = getHistory();
            const entryIndex = history.findIndex(h => h.id === historyEntry.id);
            if (entryIndex > -1) {
                history[entryIndex].lastUsed = new Date().toISOString();
                window.CoreStorageService?.setValue('mcp-command-history', history);
            }
            
            // Show notification
            notificationHandler('Command loaded from history. Click "Start Server" to run it.', 'info');
            
        } catch (error) {
            console.error('[MCPCommandHistory] Failed to start from history:', error);
            notificationHandler(`Failed to load command: ${error.message}`, 'error');
        }
    }
    
    /**
     * Show confirmation dialog for deleting history entry
     * @param {string} entryId - ID of the entry to delete
     */
    function confirmDelete(entryId) {
        const history = getHistory();
        const entry = history.find(h => h.id == entryId);
        
        if (!entry) {
            notificationHandler('History entry not found', 'error');
            return;
        }
        
        const confirmed = confirm(`Delete this command from history?\n\n${entry.command}\n\nThis action cannot be undone.`);
        if (confirmed) {
            deleteEntry(entryId);
        }
    }
    
    /**
     * Get human-readable time ago string
     * @param {Date} date - Date to calculate from
     * @returns {string} Time ago string
     */
    function getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
    
    /**
     * Clear all history
     */
    function clearHistory() {
        if (confirm('Clear all command history?\n\nThis action cannot be undone.')) {
            try {
                window.CoreStorageService?.setValue('mcp-command-history', []);
                updateHistoryDisplay();
                notificationHandler('Command history cleared', 'info');
            } catch (error) {
                console.error('[MCPCommandHistory] Failed to clear history:', error);
                notificationHandler('Failed to clear history', 'error');
            }
        }
    }
    
    // Public API
    return {
        init,
        getHistory,
        saveCommand,
        deleteEntry,
        updateHistoryDisplay,
        startFromHistory,
        confirmDelete,
        clearHistory
    };
})();