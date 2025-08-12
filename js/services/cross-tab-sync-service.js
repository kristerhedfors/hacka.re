/**
 * Cross-Tab Synchronization Service
 * 
 * Handles synchronization of conversation data across multiple tabs
 * for the same shared link namespace. Uses localStorage events
 * and a queue system to ensure all tabs stay in sync.
 */

window.CrossTabSyncService = (function() {
    let isInitialized = false;
    let syncQueue = [];
    let lastKnownHistoryHash = null;
    let syncCheckInterval = null;
    
    // Constants
    const SYNC_CHECK_INTERVAL = 2000; // Check every 2 seconds
    const SYNC_TRIGGER_KEY = 'hackare_sync_trigger';     // Properly prefixed
    const HISTORY_HASH_KEY = 'hackare_history_hash';    // Properly prefixed for cross-tab sync
    
    /**
     * Initialize cross-tab synchronization
     * Only active for shared links (localStorage mode)
     */
    function init() {
        if (isInitialized) {
            return;
        }
        
        console.log('[CrossTabSync] Initializing cross-tab synchronization...');
        
        // Only enable for shared links (localStorage mode)
        if (!StorageTypeService || !StorageTypeService.isUsingLocalStorage()) {
            console.log('[CrossTabSync] Not using localStorage - cross-tab sync disabled');
            return;
        }
        
        isInitialized = true;
        
        // Listen for storage events from other tabs
        window.addEventListener('storage', handleStorageEvent);
        
        // Start periodic sync check
        startSyncCheck();
        
        // Initialize history hash
        updateHistoryHash();
        
        console.log('[CrossTabSync] Cross-tab synchronization initialized');
    }
    
    /**
     * Handle localStorage events from other tabs
     * @param {StorageEvent} event - The storage event
     */
    function handleStorageEvent(event) {
        // Only handle our sync events
        if (event.key !== SYNC_TRIGGER_KEY && event.key !== HISTORY_HASH_KEY) {
            return;
        }
        
        console.log('[CrossTabSync] Storage event received:', event.key, event.newValue);
        
        if (event.key === SYNC_TRIGGER_KEY) {
            // Another tab triggered a sync
            handleSyncTrigger(event.newValue);
        } else if (event.key === HISTORY_HASH_KEY) {
            // History hash changed in another tab
            handleHistoryHashChange(event.newValue);
        }
    }
    
    /**
     * Handle sync trigger from another tab
     * @param {string} triggerData - JSON string with sync information
     */
    function handleSyncTrigger(triggerData) {
        if (!triggerData) return;
        
        try {
            const data = JSON.parse(triggerData);
            const { type, timestamp, namespaceId } = data;
            
            // Only sync if it's for our namespace
            const currentNamespace = NamespaceService ? NamespaceService.getNamespaceId() : null;
            if (namespaceId && currentNamespace && namespaceId !== currentNamespace) {
                console.log('[CrossTabSync] Ignoring sync for different namespace:', namespaceId);
                return;
            }
            
            console.log('[CrossTabSync] Processing sync trigger:', type, 'at', new Date(timestamp));
            
            // Add to sync queue
            syncQueue.push({
                type,
                timestamp,
                namespaceId
            });
            
            // Process queue
            processSyncQueue();
            
        } catch (error) {
            console.error('[CrossTabSync] Error handling sync trigger:', error);
        }
    }
    
    /**
     * Handle history hash change from another tab
     * @param {string} newHash - New history hash
     */
    function handleHistoryHashChange(newHash) {
        if (newHash && newHash !== lastKnownHistoryHash) {
            console.log('[CrossTabSync] History hash changed in another tab, syncing...');
            lastKnownHistoryHash = newHash;
            
            // Reload conversation history
            if (window.aiHackare && window.aiHackare.chatManager) {
                setTimeout(() => {
                    console.log('[CrossTabSync] Reloading conversation history due to cross-tab update');
                    window.aiHackare.chatManager.reloadConversationHistory();
                }, 100); // Small delay to ensure storage is updated
            }
        }
    }
    
    /**
     * Start periodic sync checking
     */
    function startSyncCheck() {
        if (syncCheckInterval) {
            clearInterval(syncCheckInterval);
        }
        
        syncCheckInterval = setInterval(() => {
            checkForUpdates();
        }, SYNC_CHECK_INTERVAL);
        
        console.log('[CrossTabSync] Started periodic sync check (every', SYNC_CHECK_INTERVAL, 'ms)');
    }
    
    /**
     * Stop periodic sync checking
     */
    function stopSyncCheck() {
        if (syncCheckInterval) {
            clearInterval(syncCheckInterval);
            syncCheckInterval = null;
            console.log('[CrossTabSync] Stopped periodic sync check');
        }
    }
    
    /**
     * Check for conversation updates
     */
    function checkForUpdates() {
        try {
            // Get current history hash
            const currentHistoryHash = getHistoryHash();
            
            // Compare with last known hash
            if (currentHistoryHash !== lastKnownHistoryHash) {
                console.log('[CrossTabSync] History changed, updating other tabs');
                lastKnownHistoryHash = currentHistoryHash;
                updateHistoryHash();
            }
            
        } catch (error) {
            console.error('[CrossTabSync] Error checking for updates:', error);
        }
    }
    
    /**
     * Process the sync queue
     */
    function processSyncQueue() {
        while (syncQueue.length > 0) {
            const syncItem = syncQueue.shift();
            
            try {
                switch (syncItem.type) {
                    case 'history_update':
                        handleHistoryUpdate(syncItem);
                        break;
                    case 'message_added':
                        handleMessageAdded(syncItem);
                        break;
                    default:
                        console.log('[CrossTabSync] Unknown sync type:', syncItem.type);
                }
            } catch (error) {
                console.error('[CrossTabSync] Error processing sync item:', error, syncItem);
            }
        }
    }
    
    /**
     * Handle history update sync
     * @param {Object} syncItem - Sync item data
     */
    function handleHistoryUpdate(syncItem) {
        console.log('[CrossTabSync] Handling history update sync');
        
        if (window.aiHackare && window.aiHackare.chatManager) {
            window.aiHackare.chatManager.reloadConversationHistory();
        }
    }
    
    /**
     * Handle message added sync
     * @param {Object} syncItem - Sync item data
     */
    function handleMessageAdded(syncItem) {
        console.log('[CrossTabSync] Handling message added sync');
        
        if (window.aiHackare && window.aiHackare.chatManager) {
            window.aiHackare.chatManager.reloadConversationHistory();
        }
    }
    
    /**
     * Trigger sync for other tabs
     * @param {string} type - Type of sync event
     * @param {Object} data - Additional data for the sync
     */
    function triggerSync(type, data = {}) {
        if (!isInitialized) {
            return;
        }
        
        try {
            const currentNamespace = NamespaceService ? NamespaceService.getNamespaceId() : null;
            
            const triggerData = {
                type,
                timestamp: Date.now(),
                namespaceId: currentNamespace,
                ...data
            };
            
            console.log('[CrossTabSync] Triggering sync for other tabs:', type);
            
            // Use sessionStorage to trigger event (localStorage would trigger for this tab too)
            // But we need localStorage for cross-tab, so we'll filter out our own events
            localStorage.setItem(SYNC_TRIGGER_KEY, JSON.stringify(triggerData));
            
            // Remove the trigger after a brief moment to allow other tabs to process it
            setTimeout(() => {
                localStorage.removeItem(SYNC_TRIGGER_KEY);
            }, 100);
            
        } catch (error) {
            console.error('[CrossTabSync] Error triggering sync:', error);
        }
    }
    
    /**
     * Get hash of current conversation history
     * @returns {string} Hash of the conversation history
     */
    function getHistoryHash() {
        try {
            const history = StorageService ? StorageService.loadChatHistory() : null;
            if (!history || !Array.isArray(history)) {
                return 'empty';
            }
            
            // Create a simple hash based on message count and last message content
            const messageCount = history.length;
            const lastMessage = history[history.length - 1];
            const lastContent = lastMessage ? lastMessage.content : '';
            const lastTimestamp = lastMessage ? lastMessage.timestamp : '';
            
            return `${messageCount}_${lastContent.length}_${lastTimestamp}`;
        } catch (error) {
            console.error('[CrossTabSync] Error getting history hash:', error);
            return 'error';
        }
    }
    
    /**
     * Update the stored history hash - USING PROPER HACKARE_ PREFIXED KEY
     * Note: Cross-tab sync requires direct localStorage access for storage events to work
     */
    function updateHistoryHash() {
        try {
            const currentHash = getHistoryHash();
            // Use direct localStorage with proper hackare_ prefix for cross-tab sync
            localStorage.setItem(HISTORY_HASH_KEY, currentHash);
            lastKnownHistoryHash = currentHash;
        } catch (error) {
            console.error('[CrossTabSync] Error updating history hash:', error);
        }
    }
    
    /**
     * Notify that conversation history was updated
     */
    function notifyHistoryUpdate() {
        updateHistoryHash();
        triggerSync('history_update');
    }
    
    /**
     * Notify that a message was added
     */
    function notifyMessageAdded() {
        updateHistoryHash();
        triggerSync('message_added');
    }
    
    /**
     * Clean up sync service
     */
    function destroy() {
        if (!isInitialized) {
            return;
        }
        
        console.log('[CrossTabSync] Destroying cross-tab sync service');
        
        window.removeEventListener('storage', handleStorageEvent);
        stopSyncCheck();
        
        // Clear any remaining data
        try {
            localStorage.removeItem(SYNC_TRIGGER_KEY);
        } catch (error) {
            // Ignore errors when cleaning up
        }
        
        isInitialized = false;
    }
    
    // Public API
    return {
        init,
        destroy,
        triggerSync,
        notifyHistoryUpdate,
        notifyMessageAdded,
        isInitialized: () => isInitialized
    };
})();

// Auto-initialize when DOM is ready and other services are loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for other services to be ready
    setTimeout(() => {
        if (window.StorageTypeService && window.NamespaceService && window.StorageService) {
            window.CrossTabSyncService.init();
        } else {
            console.log('[CrossTabSync] Required services not ready, will try again...');
            // Try again after a longer delay
            setTimeout(() => {
                window.CrossTabSyncService.init();
            }, 2000);
        }
    }, 1000);
});