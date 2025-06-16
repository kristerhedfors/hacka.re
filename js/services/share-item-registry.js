/**
 * Registry for share items that can be included in shared links
 */
export class ShareItemRegistry {
    constructor() {
        this.items = new Map();
        this.initialized = false;
    }

    /**
     * Register a share item
     * @param {string} id - Unique identifier for the item
     * @param {Object} config - Item configuration
     * @param {string} config.checkboxId - DOM ID of the checkbox
     * @param {string} config.label - Display label
     * @param {Function} config.collectData - Function to collect item data
     * @param {Function} config.applyData - Function to apply shared data
     * @param {Function} config.estimateSize - Function to estimate data size
     * @param {boolean} config.isSensitive - Whether item contains sensitive data
     * @param {boolean} config.defaultChecked - Default checkbox state
     * @param {number} config.priority - Display order priority
     */
    register(id, config) {
        if (this.items.has(id)) {
            console.warn(`Share item '${id}' is already registered`);
            return;
        }

        // Validate required fields
        const required = ['checkboxId', 'label', 'collectData', 'applyData', 'estimateSize'];
        for (const field of required) {
            if (!config[field]) {
                throw new Error(`Share item '${id}' missing required field: ${field}`);
            }
        }

        this.items.set(id, {
            id,
            checkboxId: config.checkboxId,
            label: config.label,
            collectData: config.collectData,
            applyData: config.applyData,
            estimateSize: config.estimateSize,
            isSensitive: config.isSensitive || false,
            defaultChecked: config.defaultChecked || false,
            priority: config.priority || 100,
            enabled: config.enabled !== false
        });

        console.log(`Registered share item: ${id}`);
    }

    /**
     * Unregister a share item
     * @param {string} id - Item ID to remove
     */
    unregister(id) {
        if (this.items.delete(id)) {
            console.log(`Unregistered share item: ${id}`);
        }
    }

    /**
     * Get all registered items
     * @returns {Array} Array of [id, config] pairs
     */
    getAll() {
        return Array.from(this.items.entries())
            .filter(([_, config]) => config.enabled)
            .sort((a, b) => a[1].priority - b[1].priority);
    }

    /**
     * Get enabled items only
     * @returns {Array} Array of [id, config] pairs
     */
    getEnabled() {
        return Array.from(this.items.entries())
            .filter(([_, config]) => config.enabled);
    }

    /**
     * Get a specific item by ID
     * @param {string} id - Item ID
     * @returns {Object|null} Item configuration or null
     */
    get(id) {
        return this.items.get(id) || null;
    }

    /**
     * Check if an item exists
     * @param {string} id - Item ID
     * @returns {boolean}
     */
    has(id) {
        return this.items.has(id);
    }

    /**
     * Get items that are currently selected (checkbox checked)
     * @returns {Array} Array of selected [id, config] pairs
     */
    getSelected() {
        return this.getAll().filter(([id, config]) => {
            const checkbox = document.getElementById(config.checkboxId);
            return checkbox && checkbox.checked;
        });
    }

    /**
     * Get sensitive items
     * @returns {Array} Array of sensitive [id, config] pairs
     */
    getSensitive() {
        return this.getAll().filter(([_, config]) => config.isSensitive);
    }

    /**
     * Enable or disable an item
     * @param {string} id - Item ID
     * @param {boolean} enabled - Whether to enable the item
     */
    setEnabled(id, enabled) {
        const item = this.items.get(id);
        if (item) {
            item.enabled = enabled;
            console.log(`${enabled ? 'Enabled' : 'Disabled'} share item: ${id}`);
        }
    }

    /**
     * Clear all registered items
     */
    clear() {
        this.items.clear();
        console.log('Cleared all share items');
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry stats
     */
    getStats() {
        const all = Array.from(this.items.values());
        return {
            total: all.length,
            enabled: all.filter(item => item.enabled).length,
            sensitive: all.filter(item => item.isSensitive).length,
            defaultChecked: all.filter(item => item.defaultChecked).length
        };
    }
}

// Singleton instance
let registryInstance = null;

/**
 * Get the singleton registry instance
 * @returns {ShareItemRegistry}
 */
export function getShareItemRegistry() {
    if (!registryInstance) {
        registryInstance = new ShareItemRegistry();
    }
    return registryInstance;
}