/**
 * Settings Manager Module
 * Handles settings-related functionality for the AIHackare application
 * This is a wrapper that directly uses the modular settings manager
 */

// Use the modular settings manager from the settings directory
window.SettingsManager = window.SettingsManager || {};

// Create a wrapper around the modular settings manager
(function() {
    // Store a reference to the original createSettingsManager function
    const originalCreateSettingsManager = window.SettingsManager.createSettingsManager;
    
    // Define our wrapper function
    window.SettingsManager.createSettingsManager = function(elements) {
        return originalCreateSettingsManager(elements);
    };
})();
