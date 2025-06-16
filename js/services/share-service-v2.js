import { SHARE_CONFIG } from '../config/share-config.js';
import { getShareItemRegistry } from './share-item-registry.js';
import { ShareItem } from '../components/share/share-item.js';

/**
 * ShareServiceV2 - Refactored share service using the registry system
 */
export class ShareServiceV2 {
    constructor(linkSharingService, cryptoService) {
        this.linkSharingService = linkSharingService || window.LinkSharingService;
        this.crypto = cryptoService || window.CryptoUtils;
        this.registry = getShareItemRegistry();
        this.shareItems = new Map();
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the service
     */
    initialize() {
        this.createShareItems();
        console.log('ShareServiceV2 initialized');
    }

    /**
     * Create ShareItem instances for all registered items
     */
    createShareItems() {
        const registeredItems = this.registry.getAll();
        
        for (const [id, config] of registeredItems) {
            try {
                const shareItem = new ShareItem(id, config);
                this.shareItems.set(id, shareItem);
            } catch (error) {
                console.error(`Failed to create ShareItem for '${id}':`, error);
            }
        }
        
        console.log(`Created ${this.shareItems.size} share items`);
    }

    /**
     * Generate a strong random password
     * @returns {string} Random password
     */
    generateStrongPassword() {
        const length = SHARE_CONFIG.DEFAULT_PASSWORD_LENGTH;
        const charset = SHARE_CONFIG.PASSWORD_CHARSET;
        let password = "";
        
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
        
        for (let i = 0; i < length; i++) {
            password += charset[randomValues[i] % charset.length];
        }
        
        return password;
    }

    /**
     * Create a comprehensive shareable link with all selected items
     * @param {string} password - Password for encryption
     * @param {Object} options - Additional options (title, subtitle, etc.)
     * @returns {Promise<string>} Shareable URL
     */
    async createShareLink(password, options = {}) {
        try {
            // Collect data from all selected items
            const payload = await this.collectAllData();
            
            // Add metadata
            payload.version = SHARE_CONFIG.VERSION;
            payload.created = Date.now();
            
            // Add optional title and subtitle
            if (options.title && options.title.trim()) {
                payload.title = options.title.trim();
            }
            
            if (options.subtitle && options.subtitle.trim()) {
                payload.subtitle = options.subtitle.trim();
            }

            // Create encrypted link
            const link = await this.linkSharingService.createCustomShareableLink(
                payload, 
                password, 
                options
            );
            
            console.log('Created share link with data keys:', Object.keys(payload));
            return link;
            
        } catch (error) {
            console.error('Failed to create share link:', error);
            throw new Error(`Share link creation failed: ${error.message}`);
        }
    }

    /**
     * Collect data from all selected share items
     * @returns {Promise<Object>} Combined data payload
     */
    async collectAllData() {
        const payload = {};
        const errors = [];
        
        for (const [id, shareItem] of this.shareItems) {
            try {
                if (shareItem.isSelected()) {
                    const data = await shareItem.collectData();
                    if (data !== null && data !== undefined) {
                        payload[id] = data;
                    }
                }
            } catch (error) {
                const errorMsg = `Failed to collect data for '${id}': ${error.message}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }
        
        if (errors.length > 0) {
            throw new Error(`Data collection errors: ${errors.join('; ')}`);
        }
        
        return payload;
    }

    /**
     * Apply shared data to the application
     * @param {Object} sharedData - Data from shared link
     * @returns {Promise<Object>} Results of applying data
     */
    async applySharedData(sharedData) {
        const results = {
            applied: [],
            errors: [],
            skipped: []
        };
        
        for (const [id, data] of Object.entries(sharedData)) {
            // Skip metadata fields
            if (['version', 'created', 'title', 'subtitle'].includes(id)) {
                continue;
            }
            
            const shareItem = this.shareItems.get(id);
            if (!shareItem) {
                results.skipped.push(`Unknown share item: ${id}`);
                continue;
            }
            
            try {
                await shareItem.applyData(data);
                results.applied.push(id);
                console.log(`Applied shared data for: ${id}`);
            } catch (error) {
                const errorMsg = `Failed to apply data for '${id}': ${error.message}`;
                console.error(errorMsg);
                results.errors.push(errorMsg);
            }
        }
        
        return results;
    }

    /**
     * Estimate the total size of selected data
     * @returns {Promise<number>} Estimated size in bytes
     */
    async estimateTotalSize() {
        let totalSize = 0;
        
        // Base overhead (URL + fragment + encryption)
        totalSize += window.location.origin.length;
        totalSize += window.location.pathname.length;
        totalSize += 8; // "#shared="
        totalSize += SHARE_CONFIG.ENCRYPTION_OVERHEAD;
        
        // Add size of each selected item
        for (const [id, shareItem] of this.shareItems) {
            try {
                const itemSize = await shareItem.estimateSize();
                totalSize += itemSize;
                
                // Add JSON structure overhead (quotes, colons, commas)
                if (itemSize > 0) {
                    totalSize += id.length + 10; // Key name + JSON structure
                }
            } catch (error) {
                console.warn(`Failed to estimate size for '${id}':`, error);
            }
        }
        
        // Account for base64 encoding overhead
        totalSize = Math.ceil(totalSize * SHARE_CONFIG.ENCODING_OVERHEAD);
        
        return totalSize;
    }

    /**
     * Get selected share items
     * @returns {Array<ShareItem>} Array of selected ShareItem instances
     */
    getSelectedItems() {
        return Array.from(this.shareItems.values()).filter(item => item.isSelected());
    }

    /**
     * Get all share items
     * @returns {Array<ShareItem>} Array of all ShareItem instances
     */
    getAllItems() {
        return Array.from(this.shareItems.values());
    }

    /**
     * Get sensitive items that are selected
     * @returns {Array<ShareItem>} Array of selected sensitive items
     */
    getSelectedSensitiveItems() {
        return this.getSelectedItems().filter(item => item.isSensitive());
    }

    /**
     * Validate all selected items
     * @returns {Promise<Array<string>>} Array of validation error messages
     */
    async validateSelectedItems() {
        const errors = [];
        
        for (const shareItem of this.getSelectedItems()) {
            try {
                const itemErrors = await shareItem.validate();
                errors.push(...itemErrors);
            } catch (error) {
                errors.push(`Validation failed for ${shareItem.id}: ${error.message}`);
            }
        }
        
        return errors;
    }

    /**
     * Save share options to storage
     * @returns {Promise<void>}
     */
    async saveShareOptions() {
        const options = {};
        
        for (const [id, shareItem] of this.shareItems) {
            options[`include_${id}`] = shareItem.isSelected();
        }
        
        localStorage.setItem(SHARE_CONFIG.STORAGE_KEYS.SHARE_OPTIONS, JSON.stringify(options));
        console.log('Saved share options');
    }

    /**
     * Load share options from storage
     * @returns {Promise<void>}
     */
    async loadShareOptions() {
        try {
            const optionsJson = localStorage.getItem(SHARE_CONFIG.STORAGE_KEYS.SHARE_OPTIONS);
            if (!optionsJson) {
                // Apply defaults
                this.applyDefaultOptions();
                return;
            }
            
            const options = JSON.parse(optionsJson);
            
            for (const [id, shareItem] of this.shareItems) {
                const optionKey = `include_${id}`;
                if (options[optionKey] !== undefined) {
                    shareItem.setSelected(options[optionKey]);
                }
            }
            
            console.log('Loaded share options');
        } catch (error) {
            console.error('Failed to load share options:', error);
            this.applyDefaultOptions();
        }
    }

    /**
     * Apply default share options
     */
    applyDefaultOptions() {
        for (const [id, shareItem] of this.shareItems) {
            const config = this.registry.get(id);
            if (config) {
                shareItem.setSelected(config.defaultChecked || false);
            }
        }
        console.log('Applied default share options');
    }

    /**
     * Reset all share items to default state
     */
    resetToDefaults() {
        for (const shareItem of this.shareItems.values()) {
            shareItem.reset();
        }
        console.log('Reset share items to defaults');
    }

    /**
     * Add event listeners to all share item checkboxes
     * @param {Function} changeHandler - Function to call when checkbox changes
     */
    addChangeListeners(changeHandler) {
        for (const shareItem of this.shareItems.values()) {
            shareItem.addEventListener('change', changeHandler);
        }
    }

    /**
     * Remove event listeners from all share item checkboxes
     * @param {Function} changeHandler - Function to remove
     */
    removeChangeListeners(changeHandler) {
        for (const shareItem of this.shareItems.values()) {
            shareItem.removeEventListener('change', changeHandler);
        }
    }

    /**
     * Get summary of current share state
     * @returns {Object} Share state summary
     */
    getShareSummary() {
        const items = Array.from(this.shareItems.values());
        const selected = items.filter(item => item.isSelected());
        const sensitive = selected.filter(item => item.isSensitive());
        
        return {
            totalItems: items.length,
            selectedItems: selected.length,
            sensitiveItems: sensitive.length,
            selectedIds: selected.map(item => item.id),
            sensitiveIds: sensitive.map(item => item.id)
        };
    }

    /**
     * Check if the current URL contains a shared link
     * @returns {boolean}
     */
    hasSharedData() {
        return this.linkSharingService.hasSharedApiKey();
    }

    /**
     * Extract and decrypt shared data from URL
     * @param {string} password - Decryption password
     * @returns {Promise<Object>} Shared data
     */
    async extractSharedData(password) {
        return this.linkSharingService.extractSharedApiKey(password);
    }

    /**
     * Clear shared data from URL
     */
    clearSharedDataFromUrl() {
        this.linkSharingService.clearSharedApiKeyFromUrl();
    }

    /**
     * Dispose of the service and clean up resources
     */
    dispose() {
        for (const shareItem of this.shareItems.values()) {
            shareItem.dispose();
        }
        this.shareItems.clear();
        console.log('ShareServiceV2 disposed');
    }
}

// Create global instance for backward compatibility
window.ShareServiceV2 = new ShareServiceV2();