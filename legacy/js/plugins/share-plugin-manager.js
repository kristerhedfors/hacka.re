import { getShareItemRegistry } from '../services/share-item-registry.js';
import { ShareItem } from '../components/share/share-item.js';

/**
 * Manager for share plugins and dynamic item registration
 */
export class SharePluginManager {
    constructor() {
        this.registry = getShareItemRegistry();
        this.plugins = new Map();
        this.autoUIContainer = null;
    }

    /**
     * Register a share plugin
     * @param {Object} plugin - Plugin configuration
     * @param {string} plugin.id - Unique plugin ID
     * @param {string} plugin.name - Plugin display name
     * @param {string} plugin.version - Plugin version
     * @param {Object} plugin.shareItem - Share item configuration
     * @param {boolean} plugin.autoCreateUI - Whether to auto-generate UI
     * @param {Function} plugin.initialize - Optional initialization function
     * @param {Function} plugin.cleanup - Optional cleanup function
     */
    registerPlugin(plugin) {
        if (this.plugins.has(plugin.id)) {
            console.warn(`Plugin '${plugin.id}' is already registered`);
            return false;
        }

        try {
            // Validate plugin structure
            this.validatePlugin(plugin);

            // Register the share item
            this.registry.register(plugin.shareItem.id || plugin.id, plugin.shareItem);

            // Auto-create UI if requested
            if (plugin.autoCreateUI) {
                this.createCheckboxUI(plugin);
            }

            // Initialize plugin if it has an initializer
            if (plugin.initialize && typeof plugin.initialize === 'function') {
                plugin.initialize();
            }

            // Store plugin reference
            this.plugins.set(plugin.id, {
                ...plugin,
                registered: Date.now(),
                shareItemId: plugin.shareItem.id || plugin.id
            });

            console.log(`Registered share plugin: ${plugin.id} v${plugin.version}`);
            return true;

        } catch (error) {
            console.error(`Failed to register plugin '${plugin.id}':`, error);
            return false;
        }
    }

    /**
     * Unregister a share plugin
     * @param {string} pluginId - Plugin ID to remove
     */
    unregisterPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            console.warn(`Plugin '${pluginId}' not found`);
            return false;
        }

        try {
            // Cleanup plugin if it has a cleanup function
            if (plugin.cleanup && typeof plugin.cleanup === 'function') {
                plugin.cleanup();
            }

            // Remove from registry
            this.registry.unregister(plugin.shareItemId);

            // Remove auto-created UI
            if (plugin.autoCreateUI) {
                this.removeCheckboxUI(plugin);
            }

            // Remove plugin reference
            this.plugins.delete(pluginId);

            console.log(`Unregistered share plugin: ${pluginId}`);
            return true;

        } catch (error) {
            console.error(`Failed to unregister plugin '${pluginId}':`, error);
            return false;
        }
    }

    /**
     * Get all registered plugins
     * @returns {Array} Array of plugin configurations
     */
    getPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Get a specific plugin by ID
     * @param {string} pluginId - Plugin ID
     * @returns {Object|null} Plugin configuration or null
     */
    getPlugin(pluginId) {
        return this.plugins.get(pluginId) || null;
    }

    /**
     * Create checkbox UI for a plugin
     * @param {Object} plugin - Plugin configuration
     */
    createCheckboxUI(plugin) {
        const container = this.getUIContainer();
        if (!container) {
            console.warn('Share items container not found, cannot create UI');
            return;
        }

        const shareItem = plugin.shareItem;
        const checkboxId = shareItem.checkboxId || `share-${plugin.id}`;

        // Check if UI already exists
        if (document.getElementById(checkboxId)) {
            console.warn(`UI for plugin '${plugin.id}' already exists`);
            return;
        }

        // Create checkbox group
        const div = document.createElement('div');
        div.className = 'checkbox-group';
        div.dataset.pluginId = plugin.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.className = 'share-checkbox';
        checkbox.checked = shareItem.defaultChecked || false;

        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = shareItem.label;

        // Add sensitive indicator if needed
        if (shareItem.isSensitive) {
            const sensitiveIcon = document.createElement('span');
            sensitiveIcon.className = 'sensitive-indicator';
            sensitiveIcon.title = 'Contains sensitive data';
            sensitiveIcon.textContent = '🔒';
            label.appendChild(sensitiveIcon);
        }

        div.appendChild(checkbox);
        div.appendChild(label);

        // Insert based on priority
        const priority = shareItem.priority || 100;
        const existingGroups = container.querySelectorAll('.checkbox-group');
        let inserted = false;

        for (const group of existingGroups) {
            const groupPriority = parseInt(group.dataset.priority) || 100;
            if (priority < groupPriority) {
                container.insertBefore(div, group);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            container.appendChild(div);
        }

        // Store priority for future insertions
        div.dataset.priority = priority.toString();

        console.log(`Created UI for plugin '${plugin.id}'`);
    }

    /**
     * Remove checkbox UI for a plugin
     * @param {Object} plugin - Plugin configuration
     */
    removeCheckboxUI(plugin) {
        const container = this.getUIContainer();
        if (!container) return;

        const element = container.querySelector(`[data-plugin-id="${plugin.id}"]`);
        if (element) {
            element.remove();
            console.log(`Removed UI for plugin '${plugin.id}'`);
        }
    }

    /**
     * Get the UI container for share items
     * @returns {Element|null}
     */
    getUIContainer() {
        if (!this.autoUIContainer) {
            // Try multiple selectors
            const selectors = [
                '.share-items-container',
                '#share-items',
                '.share-modal .checkbox-container',
                '.share-modal .modal-body'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    this.autoUIContainer = element;
                    break;
                }
            }
        }
        return this.autoUIContainer;
    }

    /**
     * Set the UI container for auto-generated share items
     * @param {Element|string} container - Container element or selector
     */
    setUIContainer(container) {
        if (typeof container === 'string') {
            this.autoUIContainer = document.querySelector(container);
        } else {
            this.autoUIContainer = container;
        }
    }

    /**
     * Validate plugin structure
     * @param {Object} plugin - Plugin to validate
     */
    validatePlugin(plugin) {
        const required = ['id', 'name', 'version', 'shareItem'];
        for (const field of required) {
            if (!plugin[field]) {
                throw new Error(`Plugin missing required field: ${field}`);
            }
        }

        const shareItemRequired = ['label', 'collectData', 'applyData', 'estimateSize'];
        for (const field of shareItemRequired) {
            if (!plugin.shareItem[field]) {
                throw new Error(`Plugin shareItem missing required field: ${field}`);
            }
        }

        if (typeof plugin.shareItem.collectData !== 'function') {
            throw new Error('Plugin shareItem.collectData must be a function');
        }

        if (typeof plugin.shareItem.applyData !== 'function') {
            throw new Error('Plugin shareItem.applyData must be a function');
        }

        if (typeof plugin.shareItem.estimateSize !== 'function') {
            throw new Error('Plugin shareItem.estimateSize must be a function');
        }
    }

    /**
     * Initialize all plugins
     */
    initializeAll() {
        for (const [id, plugin] of this.plugins) {
            if (plugin.initialize && typeof plugin.initialize === 'function') {
                try {
                    plugin.initialize();
                    console.log(`Initialized plugin: ${id}`);
                } catch (error) {
                    console.error(`Failed to initialize plugin '${id}':`, error);
                }
            }
        }
    }

    /**
     * Cleanup all plugins
     */
    cleanupAll() {
        for (const [id, plugin] of this.plugins) {
            if (plugin.cleanup && typeof plugin.cleanup === 'function') {
                try {
                    plugin.cleanup();
                    console.log(`Cleaned up plugin: ${id}`);
                } catch (error) {
                    console.error(`Failed to cleanup plugin '${id}':`, error);
                }
            }
        }
    }

    /**
     * Get plugin statistics
     * @returns {Object} Plugin stats
     */
    getStats() {
        const plugins = Array.from(this.plugins.values());
        return {
            total: plugins.length,
            withAutoUI: plugins.filter(p => p.autoCreateUI).length,
            withInitializer: plugins.filter(p => p.initialize).length,
            withCleanup: plugins.filter(p => p.cleanup).length,
            sensitive: plugins.filter(p => p.shareItem.isSensitive).length
        };
    }

    /**
     * Create a simple plugin from minimal configuration
     * @param {Object} config - Simple plugin config
     * @param {string} config.id - Plugin ID
     * @param {string} config.label - Display label
     * @param {Function} config.getData - Function to get data
     * @param {Function} config.setData - Function to set data
     * @param {boolean} config.sensitive - Whether data is sensitive
     * @returns {Object} Full plugin configuration
     */
    createSimplePlugin(config) {
        return {
            id: config.id,
            name: config.label,
            version: '1.0.0',
            autoCreateUI: true,
            shareItem: {
                id: config.id,
                checkboxId: `share-${config.id}`,
                label: config.label,
                isSensitive: config.sensitive || false,
                defaultChecked: false,
                priority: config.priority || 100,
                collectData: config.getData,
                applyData: config.setData,
                estimateSize: async () => {
                    try {
                        const data = await config.getData();
                        return data ? JSON.stringify(data).length : 0;
                    } catch {
                        return 0;
                    }
                }
            }
        };
    }
}

// Singleton instance
let pluginManagerInstance = null;

/**
 * Get the singleton plugin manager instance
 * @returns {SharePluginManager}
 */
export function getSharePluginManager() {
    if (!pluginManagerInstance) {
        pluginManagerInstance = new SharePluginManager();
    }
    return pluginManagerInstance;
}