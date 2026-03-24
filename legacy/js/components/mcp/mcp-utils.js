/**
 * MCP Utilities
 * 
 * Shared utilities and helper functions for MCP components
 */

window.MCPUtils = (function() {
    /**
     * Show a notification to the user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    function showNotification(message, type = 'info') {
        // Log to console
        console.log(`[MCP][${type.toUpperCase()}] ${message}`);
        
        // Integrate with hacka.re's existing notification system
        if (window.ChatManager && window.ChatManager.addSystemMessage) {
            const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
            window.ChatManager.addSystemMessage(`${icon} MCP: ${message}`);
        }
    }
    
    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @param {string} successMessage - Message to show on success
     * @returns {Promise<void>}
     */
    async function copyToClipboard(text, successMessage = 'Copied to clipboard') {
        try {
            await navigator.clipboard.writeText(text);
            showNotification(successMessage, 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            showNotification('Failed to copy to clipboard', 'error');
            throw error;
        }
    }
    
    /**
     * Parse command line arguments
     * @param {string} commandLine - Command line string
     * @returns {Object} Object with command and args
     */
    function parseCommand(commandLine) {
        const parts = commandLine.trim().split(/\s+/).filter(part => part);
        return {
            command: parts[0] || '',
            args: parts.slice(1)
        };
    }
    
    /**
     * Validate JSON string
     * @param {string} jsonString - JSON string to validate
     * @returns {Object|null} Parsed object or null if invalid
     */
    function parseJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    function formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
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
    
    /**
     * Generate unique ID
     * @param {string} prefix - Optional prefix
     * @returns {string} Unique ID
     */
    function generateId(prefix = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
    }
    
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    /**
     * Check if a URL is valid
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get storage service
     * @returns {Object|null} Storage service instance
     */
    function getStorageService() {
        return window.CoreStorageService || null;
    }
    
    /**
     * Save data to encrypted storage
     * @param {string} key - Storage key
     * @param {*} value - Value to save
     * @returns {boolean} Success status
     */
    function saveToStorage(key, value) {
        try {
            const storage = getStorageService();
            if (storage) {
                storage.setValue(key, value);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Failed to save ${key} to storage:`, error);
            return false;
        }
    }
    
    /**
     * Load data from encrypted storage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Loaded value or default
     */
    function loadFromStorage(key, defaultValue = null) {
        try {
            const storage = getStorageService();
            if (storage) {
                const value = storage.getValue(key);
                return value !== undefined ? value : defaultValue;
            }
            return defaultValue;
        } catch (error) {
            console.error(`Failed to load ${key} from storage:`, error);
            return defaultValue;
        }
    }
    
    /**
     * Create a promise that resolves after a delay
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise<void>}
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Format timestamp to relative time
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} Formatted time string
     */
    function formatRelativeTime(timestamp) {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
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
    
    // Public API
    return {
        showNotification,
        copyToClipboard,
        parseCommand,
        parseJSON,
        formatFileSize,
        debounce,
        generateId,
        escapeHtml,
        isValidUrl,
        saveToStorage,
        loadFromStorage,
        delay,
        formatRelativeTime
    };
})();