/**
 * Cross-Tab Synchronization Service
 * 
 * Handles synchronization of conversation data across multiple tabs
 * for the same shared link namespace. Uses encrypted storage through
 * DataService to ensure sync variables are properly namespaced and encrypted.
 * 
 * All tabs within the same namespace share the same master key, allowing
 * them to decrypt and sync encrypted data seamlessly.
 */

window.CrossTabSyncService = (function() {
    let isInitialized = false;
    let syncQueue = [];
    let lastKnownHistoryHash = null;
    let lastReloadTime = 0;
    let isReloading = false;
    const TAB_ID = Date.now() + '_' + Math.random();
    
    // Constants
    const SYNC_TRIGGER_KEY = 'sync_trigger';
    const HISTORY_HASH_KEY = 'history_hash';
    const TAB_HEARTBEAT_KEY = 'tab_heartbeat';
    
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
        
        // Initialize history hash
        setTimeout(() => {
            lastKnownHistoryHash = getHistoryHash();
            console.log('[CrossTabSync] Initial history hash:', lastKnownHistoryHash);
            // Store initial hash in encrypted storage
            DataService.saveSyncVariable(HISTORY_HASH_KEY, {
                hash: lastKnownHistoryHash,
                tabId: TAB_ID,
                timestamp: Date.now()
            });
        }, 2000);
        
        console.log('[CrossTabSync] Cross-tab synchronization initialized');
        console.log('[CrossTabSync] Tab ID:', TAB_ID);
        console.log('[CrossTabSync] Namespace:', NamespaceService.getNamespace());
    }
    
    /**
     * Handle localStorage events from other tabs
     * Storage events fire when encrypted storage changes in other tabs
     * @param {StorageEvent} event - The storage event
     */
    function handleStorageEvent(event) {
        if (!event.key) return;
        
        const namespaceData = NamespaceService.getNamespace();
        const namespaceId = namespaceData.namespaceId || namespaceData;
        
        // Check if this is an encrypted sync variable for our namespace
        // Keys are stored as hackare_{namespace}_{key} when namespaced
        const syncTriggerKey = `hackare_${namespaceId}_sync_${SYNC_TRIGGER_KEY}`;
        const historyHashKey = `hackare_${namespaceId}_sync_${HISTORY_HASH_KEY}`;
        
        if (event.key === syncTriggerKey) {
            // Another tab triggered a sync - get the decrypted value
            const triggerData = DataService.getSyncVariable(SYNC_TRIGGER_KEY);
            if (triggerData) {
                handleSyncTrigger(triggerData);
            }
        } else if (event.key === historyHashKey) {
            // History hash changed in another tab - get the decrypted value
            const hashData = DataService.getSyncVariable(HISTORY_HASH_KEY);
            if (hashData) {
                handleHistoryHashChange(hashData);
            }
        }
    }
    
    /**
     * Handle sync trigger from another tab
     * @param {Object} triggerData - Sync trigger data
     */
    function handleSyncTrigger(triggerData) {
        if (!triggerData) return;
        
        try {
            const { type, timestamp, namespaceId, tabId } = triggerData;
            
            // Ignore our own events
            if (tabId === TAB_ID) {
                console.log('[CrossTabSync] Ignoring our own sync trigger');
                return;
            }
            
            // Namespace check is redundant since we're using namespaced storage,
            // but keep for extra safety
            const currentNamespace = NamespaceService.getNamespaceId();
            if (namespaceId && currentNamespace && namespaceId !== currentNamespace) {
                console.log('[CrossTabSync] Ignoring sync for different namespace:', namespaceId);
                return;
            }
            
            console.log('[CrossTabSync] Processing sync trigger from tab:', tabId, 'type:', type);
            
            // Add to sync queue
            syncQueue.push({
                type,
                timestamp,
                namespaceId,
                tabId
            });
            
            // Process queue
            processSyncQueue();
            
        } catch (error) {
            console.error('[CrossTabSync] Error handling sync trigger:', error);
        }
    }
    
    /**
     * Handle history hash change from another tab
     * @param {Object} hashData - Hash data object
     */
    function handleHistoryHashChange(hashData) {
        if (!hashData) return;
        
        const { hash, tabId, timestamp } = hashData;
        
        // Ignore our own hash updates
        if (tabId === TAB_ID) {
            console.log('[CrossTabSync] Ignoring our own hash update');
            return;
        }
        
        // Ignore empty or error hashes
        if (!hash || hash === 'empty' || hash === 'error' || hash === 'reloading') {
            return;
        }
        
        // Don't process if we're already reloading
        if (isReloading) {
            console.log('[CrossTabSync] Already reloading - ignoring hash change');
            return;
        }
        
        // Check if this is actually a different hash
        if (hash !== lastKnownHistoryHash) {
            console.log('[CrossTabSync] History changed in tab:', tabId);
            
            // Prevent rapid successive reloads
            const now = Date.now();
            if (now - lastReloadTime < 5000) {
                console.log('[CrossTabSync] Skipping reload - too soon since last reload');
                return;
            }
            
            lastKnownHistoryHash = hash;
            lastReloadTime = now;
            isReloading = true;
            
            // Reload conversation history
            if (window.aiHackare && window.aiHackare.chatManager) {
                setTimeout(() => {
                    console.log('[CrossTabSync] Reloading conversation history');
                    window.aiHackare.chatManager.reloadConversationHistory();
                    
                    // Clear reloading flag after a delay
                    setTimeout(() => {
                        isReloading = false;
                        // Update our hash after reload completes
                        lastKnownHistoryHash = getHistoryHash();
                    }, 2000);
                }, 500);
            } else {
                isReloading = false;
            }
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
     * Trigger sync for other tabs in the same namespace
     * Uses encrypted storage so only tabs with the same master key can read it
     * @param {string} type - Type of sync event
     * @param {Object} data - Additional data for the sync
     */
    function triggerSync(type, data = {}) {
        if (!isInitialized) {
            return;
        }
        
        try {
            const currentNamespace = NamespaceService.getNamespaceId();
            
            const triggerData = {
                type,
                timestamp: Date.now(),
                namespaceId: currentNamespace,
                tabId: TAB_ID,
                ...data
            };
            
            console.log('[CrossTabSync] Triggering sync for other tabs:', type);
            
            // Save to encrypted storage - this will trigger storage events in other tabs
            DataService.saveSyncVariable(SYNC_TRIGGER_KEY, triggerData);
            
            // Remove the trigger after a brief moment
            setTimeout(() => {
                DataService.removeSyncVariable(SYNC_TRIGGER_KEY);
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
            if (isReloading) {
                return lastKnownHistoryHash || 'reloading';
            }
            
            const history = StorageService ? StorageService.loadChatHistory() : null;
            if (!history || !Array.isArray(history)) {
                return 'empty';
            }
            
            const messageCount = history.length;
            if (messageCount === 0) {
                return 'empty';
            }
            
            // Create stable hash based on content
            const lastMessage = history[history.length - 1];
            const lastContent = lastMessage && lastMessage.content ? lastMessage.content : '';
            const lastRole = lastMessage && lastMessage.role ? lastMessage.role : 'unknown';
            
            // Simple checksum for stability
            let contentChecksum = 0;
            for (let i = 0; i < lastContent.length; i++) {
                contentChecksum += lastContent.charCodeAt(i);
            }
            
            return `${messageCount}_${lastContent.length}_${lastRole}_${contentChecksum}`;
        } catch (error) {
            console.error('[CrossTabSync] Error getting history hash:', error);
            return 'error';
        }
    }
    
    /**
     * Update the stored history hash in encrypted storage
     * Only tabs with the same master key can read this
     */
    function updateHistoryHash() {
        try {
            const currentHash = getHistoryHash();
            
            // Save to encrypted storage with metadata
            DataService.saveSyncVariable(HISTORY_HASH_KEY, {
                hash: currentHash,
                tabId: TAB_ID,
                timestamp: Date.now()
            });
            
            lastKnownHistoryHash = currentHash;
        } catch (error) {
            console.error('[CrossTabSync] Error updating history hash:', error);
        }
    }
    
    /**
     * Notify that conversation history was updated
     */
    function notifyHistoryUpdate() {
        if (!isReloading && isInitialized) {
            const currentHash = getHistoryHash();
            
            if (currentHash !== lastKnownHistoryHash && currentHash !== 'empty' && currentHash !== 'error') {
                console.log('[CrossTabSync] Notifying history update:', currentHash);
                updateHistoryHash();
                triggerSync('history_update');
            }
        }
    }
    
    /**
     * Notify that a message was added
     */
    function notifyMessageAdded() {
        if (!isReloading && isInitialized) {
            const currentHash = getHistoryHash();
            
            if (currentHash !== lastKnownHistoryHash && currentHash !== 'empty' && currentHash !== 'error') {
                console.log('[CrossTabSync] Notifying message added:', currentHash);
                updateHistoryHash();
                triggerSync('message_added');
            }
        }
    }
    
    /**
     * Get sync status for debugging
     * @returns {Object} Current sync status
     */
    function getSyncStatus() {
        const allSyncVars = DataService.getAllSyncVariables();
        
        return {
            initialized: isInitialized,
            tabId: TAB_ID,
            namespace: NamespaceService.getNamespace(),
            lastKnownHash: lastKnownHistoryHash,
            isReloading: isReloading,
            syncVariables: allSyncVars,
            queueLength: syncQueue.length
        };
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
        
        // Clear sync variables for this tab
        try {
            DataService.removeSyncVariable(SYNC_TRIGGER_KEY);
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
        getSyncStatus,
        isInitialized: () => isInitialized
    };
})();

// Auto-initialize when DOM is ready and other services are loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for required services to be ready
    setTimeout(() => {
        if (window.StorageTypeService && window.NamespaceService && window.DataService) {
            window.CrossTabSyncService.init();
        } else {
            console.log('[CrossTabSync] Required services not ready, will try again...');
            // Try again after a longer delay
            setTimeout(() => {
                if (window.StorageTypeService && window.NamespaceService && window.DataService) {
                    window.CrossTabSyncService.init();
                }
            }, 2000);
        }
    }, 1000);
});