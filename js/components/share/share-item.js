/**
 * Share item component that wraps a shareable item configuration
 */
export class ShareItem {
    constructor(id, config) {
        this.id = id;
        this.config = config;
        this.checkbox = null;
        this.initialized = false;
        
        // Initialize DOM references
        this.initializeDOMReferences();
    }

    /**
     * Initialize DOM element references
     */
    initializeDOMReferences() {
        this.checkbox = document.getElementById(this.config.checkboxId);
        if (!this.checkbox) {
            console.warn(`Share item '${this.id}': checkbox element '${this.config.checkboxId}' not found`);
        } else {
            this.initialized = true;
        }
    }

    /**
     * Check if the item is currently selected
     * @returns {boolean}
     */
    isSelected() {
        if (!this.checkbox) {
            return false;
        }
        return this.checkbox.checked;
    }

    /**
     * Set the selected state
     * @param {boolean} selected - Whether to select the item
     */
    setSelected(selected) {
        if (this.checkbox) {
            this.checkbox.checked = selected;
        }
    }

    /**
     * Check if the item is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.config.enabled !== false;
    }

    /**
     * Check if the item contains sensitive data
     * @returns {boolean}
     */
    isSensitive() {
        return this.config.isSensitive || false;
    }

    /**
     * Collect data for this item if selected
     * @returns {Promise<any|null>} Item data or null if not selected
     */
    async collectData() {
        if (!this.isSelected() || !this.isEnabled()) {
            return null;
        }

        try {
            const data = await this.config.collectData();
            console.log(`Collected data for share item '${this.id}':`, data ? 'success' : 'empty');
            return data;
        } catch (error) {
            console.error(`Error collecting data for share item '${this.id}':`, error);
            throw new Error(`Failed to collect data for ${this.config.label}: ${error.message}`);
        }
    }

    /**
     * Apply shared data for this item
     * @param {any} data - Data to apply
     * @returns {Promise<void>}
     */
    async applyData(data) {
        if (!this.isEnabled()) {
            console.warn(`Share item '${this.id}' is disabled, skipping data application`);
            return;
        }

        try {
            await this.config.applyData(data);
            console.log(`Applied data for share item '${this.id}'`);
        } catch (error) {
            console.error(`Error applying data for share item '${this.id}':`, error);
            throw new Error(`Failed to apply data for ${this.config.label}: ${error.message}`);
        }
    }

    /**
     * Estimate the size of data for this item if selected
     * @returns {Promise<number>} Estimated size in bytes
     */
    async estimateSize() {
        if (!this.isSelected() || !this.isEnabled()) {
            return 0;
        }

        try {
            const size = await this.config.estimateSize();
            return typeof size === 'number' ? size : 0;
        } catch (error) {
            console.error(`Error estimating size for share item '${this.id}':`, error);
            return 0;
        }
    }

    /**
     * Get the display label for this item
     * @returns {string}
     */
    getLabel() {
        return this.config.label;
    }

    /**
     * Get the checkbox ID
     * @returns {string}
     */
    getCheckboxId() {
        return this.config.checkboxId;
    }

    /**
     * Get the priority for ordering
     * @returns {number}
     */
    getPriority() {
        return this.config.priority || 100;
    }

    /**
     * Add event listener to the checkbox
     * @param {string} event - Event type (e.g., 'change')
     * @param {Function} handler - Event handler function
     */
    addEventListener(event, handler) {
        if (this.checkbox) {
            this.checkbox.addEventListener(event, handler);
        }
    }

    /**
     * Remove event listener from the checkbox
     * @param {string} event - Event type
     * @param {Function} handler - Event handler function
     */
    removeEventListener(event, handler) {
        if (this.checkbox) {
            this.checkbox.removeEventListener(event, handler);
        }
    }

    /**
     * Enable or disable the checkbox
     * @param {boolean} enabled - Whether to enable the checkbox
     */
    setCheckboxEnabled(enabled) {
        if (this.checkbox) {
            this.checkbox.disabled = !enabled;
        }
    }

    /**
     * Get validation errors for this item
     * @returns {Array<string>} Array of error messages
     */
    async validate() {
        const errors = [];

        if (!this.initialized) {
            errors.push(`Checkbox element '${this.config.checkboxId}' not found`);
        }

        if (this.isSelected()) {
            try {
                const data = await this.collectData();
                if (data === null || data === undefined) {
                    errors.push(`No data available for ${this.config.label}`);
                }
            } catch (error) {
                errors.push(`Data collection failed: ${error.message}`);
            }
        }

        return errors;
    }

    /**
     * Create a summary of this item's current state
     * @returns {Object} Item state summary
     */
    getState() {
        return {
            id: this.id,
            label: this.config.label,
            selected: this.isSelected(),
            enabled: this.isEnabled(),
            sensitive: this.isSensitive(),
            initialized: this.initialized,
            checkboxId: this.config.checkboxId,
            priority: this.getPriority()
        };
    }

    /**
     * Reset the item to its default state
     */
    reset() {
        if (this.checkbox) {
            this.checkbox.checked = this.config.defaultChecked || false;
        }
    }

    /**
     * Dispose of the item and clean up resources
     */
    dispose() {
        this.checkbox = null;
        this.initialized = false;
    }
}