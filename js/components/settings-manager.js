/**
 * Settings Manager Wrapper
 * 
 * This module serves as a facade that exposes the modular settings manager
 * from the settings directory. It ensures backward compatibility while
 * delegating all functionality to the modular implementation.
 * 
 * The actual implementation is in: js/components/settings/settings-manager.js
 */

(function() {
    'use strict';
    
    // Ensure the modular settings manager is loaded
    if (!window.SettingsManager) {
        console.error('Modular SettingsManager not found. Please ensure settings/settings-manager.js is loaded first.');
        window.SettingsManager = {};
    }
    
    // Store a reference to the modular implementation
    const modularImplementation = window.SettingsManager;
    
    // Create the wrapper object
    const SettingsManagerWrapper = {
        /**
         * Create a Settings Manager instance
         * Delegates to the modular implementation
         * 
         * @param {Object} elements - DOM elements required by settings components
         * @returns {Object} Settings Manager instance with all methods
         */
        createSettingsManager: function(elements) {
            if (!modularImplementation.createSettingsManager) {
                console.error('createSettingsManager method not found in modular implementation');
                return null;
            }
            
            // Validate elements parameter
            if (!elements || typeof elements !== 'object') {
                console.warn('Invalid elements parameter passed to createSettingsManager');
            }
            
            // Delegate to the modular implementation
            return modularImplementation.createSettingsManager(elements);
        },
        
        // Expose the original implementation for debugging/testing
        _modularImplementation: modularImplementation
    };
    
    // Replace the global SettingsManager with our wrapper
    window.SettingsManager = SettingsManagerWrapper;
})();
