/**
 * Prompt Library Icon Manager Module
 * Handles visibility toggle for the Prompt Library Icon button
 *
 * IMPORTANT: This setting is NEVER shared through links
 * It's a UI preference that must be set explicitly by each user
 */

window.PromptLibraryIconManager = (function() {
    const PROMPT_LIBRARY_ICON_KEY = 'prompt_library_icon_enabled';

    /**
     * Check if prompt library icon is enabled
     * @returns {boolean} Whether prompt library icon is enabled (default: true)
     */
    function isPromptLibraryIconEnabled() {
        // Default to true if not set (icon shown by default)
        const value = CoreStorageService.getValue(PROMPT_LIBRARY_ICON_KEY);
        return value !== false; // Returns true if undefined/null or explicitly true
    }

    /**
     * Set prompt library icon enabled state
     * @param {boolean} enabled - Whether prompt library icon should be enabled
     */
    function setPromptLibraryIconEnabled(enabled) {
        CoreStorageService.setValue(PROMPT_LIBRARY_ICON_KEY, enabled);
    }

    /**
     * Create a Prompt Library Icon Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Prompt Library Icon Manager instance
     */
    function createPromptLibraryIconManager(elements) {
        /**
         * Update prompt library icon status text
         * @param {HTMLElement} statusSpan - The status span element
         * @param {boolean} iconEnabled - Whether icon is enabled
         */
        function updatePromptLibraryIconStatusText(statusSpan, iconEnabled) {
            if (!statusSpan) return;

            if (iconEnabled) {
                statusSpan.textContent = '(Enabled: Library icon shown)';
            } else {
                statusSpan.textContent = '(Disabled: Library icon hidden)';
            }
            statusSpan.style.color = 'var(--text-color-secondary)';
            statusSpan.style.fontWeight = 'normal';
        }

        /**
         * Toggle the prompt library button visibility
         * @param {boolean} show - Whether to show the button
         */
        function togglePromptLibraryButton(show) {
            const button = document.getElementById('prompt-library-btn');
            if (button) {
                button.style.display = show ? '' : 'none';
            }
        }

        /**
         * Initialize the prompt library icon manager
         */
        function init() {
            // Add prompt library icon controls after YOLO mode
            addPromptLibraryIconControls();

            // Set initial button visibility
            togglePromptLibraryButton(isPromptLibraryIconEnabled());
        }

        /**
         * Add prompt library icon controls to the settings form
         */
        function addPromptLibraryIconControls() {
            // Check if controls already exist (prevent duplicates)
            if (document.getElementById('prompt-library-icon-toggle')) {
                console.log('Prompt library icon controls already exist, skipping addition');
                return;
            }

            // Create the container
            const container = document.createElement('div');
            container.className = 'form-group';
            container.style.marginTop = '10px';

            // Create the checkbox group
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';

            // Create the checkbox input
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'prompt-library-icon-toggle';
            checkbox.checked = isPromptLibraryIconEnabled();

            // Create the label
            const label = document.createElement('label');
            label.htmlFor = 'prompt-library-icon-toggle';
            label.textContent = 'Show Prompt Library Icon';

            // Add status text
            const statusSpan = document.createElement('span');
            statusSpan.className = 'settings-item-status';
            statusSpan.id = 'prompt-library-icon-status';
            statusSpan.style.marginLeft = '10px';
            statusSpan.style.fontSize = '0.85em';
            updatePromptLibraryIconStatusText(statusSpan, checkbox.checked);
            label.appendChild(statusSpan);

            // Add event listener to the checkbox
            checkbox.addEventListener('change', function() {
                setPromptLibraryIconEnabled(this.checked);
                togglePromptLibraryButton(this.checked);
                updatePromptLibraryIconStatusText(statusSpan, this.checked);

                if (window.DebugService) {
                    DebugService.log('Prompt library icon ' + (this.checked ? 'enabled' : 'disabled'));
                }
            });

            // Append elements to the checkbox group
            checkboxGroup.appendChild(checkbox);
            checkboxGroup.appendChild(label);
            container.appendChild(checkboxGroup);

            // Find the YOLO mode section to insert after
            const yoloModeCheckbox = document.getElementById('yolo-mode');
            const yoloModeSection = yoloModeCheckbox?.closest('.form-group');
            if (yoloModeSection && yoloModeSection.parentNode) {
                // Insert the prompt library icon container after the YOLO mode section
                yoloModeSection.parentNode.insertBefore(container, yoloModeSection.nextSibling);
            }
        }

        // Public API
        return {
            init,
            isPromptLibraryIconEnabled,
            setPromptLibraryIconEnabled,
            togglePromptLibraryButton
        };
    }

    // Static methods for global access
    return {
        createPromptLibraryIconManager,
        isPromptLibraryIconEnabled,
        setPromptLibraryIconEnabled
    };
})();