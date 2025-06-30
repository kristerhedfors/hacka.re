/**
 * API Key Input Handler Module
 * Handles API key input events with auto-detection and provider updates
 */

window.ApiKeyInputHandler = (function() {
    /**
     * Set up API key input handlers for auto-detection
     * @param {Object} elements - DOM elements
     * @param {Object} componentManagers - Component managers object
     */
    function setupApiKeyInputHandlers(elements, componentManagers) {
        // Set up handler for simple API key modal
        if (elements.apiKeyInput) {
            setupSingleInputHandler(
                elements.apiKeyInput,
                elements.apiKeyDetection,
                elements.apiKeyDetectionText,
                componentManagers
            );
        }

        // Set up handler for settings modal API key update
        if (elements.apiKeyUpdate) {
            setupSingleInputHandler(
                elements.apiKeyUpdate,
                elements.apiKeyUpdateDetection,
                elements.apiKeyUpdateDetectionText,
                componentManagers
            );
        }
    }

    /**
     * Set up input handler for a single API key input field
     * @param {HTMLElement} inputElement - The input element
     * @param {HTMLElement} detectionElement - The detection display element
     * @param {HTMLElement} detectionTextElement - The detection text element
     * @param {Object} componentManagers - Component managers object
     */
    function setupSingleInputHandler(inputElement, detectionElement, detectionTextElement, componentManagers) {
        if (!inputElement || !detectionElement || !detectionTextElement) {
            console.warn('ApiKeyInputHandler: Missing required elements for input handler setup');
            return;
        }

        // Add input event listener with debouncing
        var debounceTimeout;
        var debounceDelay = 300; // 300ms delay

        inputElement.addEventListener('input', function() {
            var apiKey = this.value.trim();
            var self = this;
            
            // Clear any existing timeout
            clearTimeout(debounceTimeout);
            
            // Set a new timeout for debounced processing
            debounceTimeout = setTimeout(function() {
                handleApiKeyInput(apiKey, detectionElement, detectionTextElement, componentManagers);
            }, debounceDelay);
            
            // For very short inputs, hide detection immediately
            if (apiKey.length < 10) {
                hideDetection(detectionElement);
            }
        });

        // Also check on blur for immediate feedback
        inputElement.addEventListener('blur', function() {
            var apiKey = this.value.trim();
            if (apiKey) {
                clearTimeout(debounceTimeout);
                handleApiKeyInput(apiKey, detectionElement, detectionTextElement, componentManagers);
            }
        });
    }

    /**
     * Handle API key input and show detection results
     * @param {string} apiKey - The API key to analyze
     * @param {HTMLElement} detectionElement - The detection display element
     * @param {HTMLElement} detectionTextElement - The detection text element
     * @param {Object} componentManagers - Component managers object
     */
    function handleApiKeyInput(apiKey, detectionElement, detectionTextElement, componentManagers) {
        if (!apiKey || apiKey.length < 10) {
            hideDetection(detectionElement);
            return;
        }

        // Try to detect the provider
        var detection = window.ApiKeyDetector ? window.ApiKeyDetector.detectProvider(apiKey) : null;
        
        if (detection) {
            // Show detection result
            showDetection(detectionElement, detectionTextElement, detection);
            
            // Auto-update provider and get default model
            var defaultModel = null;
            if (componentManagers && componentManagers.baseUrl && componentManagers.baseUrl.updateProviderFromDetection) {
                defaultModel = componentManagers.baseUrl.updateProviderFromDetection(detection);
            }
            
            // Auto-select default model if available
            if (defaultModel && componentManagers && componentManagers.model && componentManagers.model.selectModel) {
                componentManagers.model.selectModel(defaultModel);
            }
        } else {
            hideDetection(detectionElement);
        }
    }

    /**
     * Show API key detection result
     * @param {HTMLElement} detectionElement - The detection display element
     * @param {HTMLElement} detectionTextElement - The detection text element
     * @param {Object} detection - Detection result object
     */
    function showDetection(detectionElement, detectionTextElement, detection) {
        if (detectionTextElement) {
            var message = detection.providerName + ' API key detected and auto-selected';
            if (detection.defaultModel) {
                message += ' (' + detection.defaultModel + ')';
            }
            detectionTextElement.textContent = message;
        }
        
        if (detectionElement) {
            detectionElement.style.display = 'block';
        }
    }

    /**
     * Hide API key detection display
     * @param {HTMLElement} detectionElement - The detection display element
     */
    function hideDetection(detectionElement) {
        if (detectionElement) {
            detectionElement.style.display = 'none';
        }
    }

    // Public API
    return {
        setupApiKeyInputHandlers: setupApiKeyInputHandlers,
        handleApiKeyInput: handleApiKeyInput
    };
})();