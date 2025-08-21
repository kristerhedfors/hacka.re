/**
 * Prompts Modal Renderer
 * Handles DOM rendering for the prompts modal interface
 * Separates rendering logic from business logic in PromptsManager
 */

window.PromptsModalRenderer = (function() {
    
    /**
     * Render the token usage container
     * @returns {HTMLElement} Token usage container element
     */
    function renderTokenUsageContainer() {
        const tokenUsageContainer = document.createElement('div');
        tokenUsageContainer.className = 'prompts-token-usage-container';
        tokenUsageContainer.innerHTML = `
            <div class="prompts-token-usage-label">
                Context usage: <span class="prompts-usage-tokens">0/0 tokens</span> <span class="prompts-usage-text">0%</span>
            </div>
            <div class="prompts-usage-bar">
                <div class="prompts-usage-fill" style="width: 1%; min-width: 2px;"></div>
            </div>
        `;
        return tokenUsageContainer;
    }
    
    /**
     * Render a regular prompt item
     * @param {Object} prompt - Prompt object
     * @param {boolean} isSelected - Whether prompt is selected
     * @param {boolean} isActive - Whether prompt is currently being edited
     * @returns {HTMLElement} Prompt item element
     */
    function renderPromptItem(prompt, isSelected, isActive = false) {
        const promptItem = document.createElement('div');
        promptItem.className = 'prompt-item';
        promptItem.dataset.promptId = prompt.id;
        
        if (isActive) {
            promptItem.classList.add('active');
        }
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'prompt-item-checkbox';
        checkbox.checked = isSelected;
        promptItem.appendChild(checkbox);
        
        // Create prompt name
        const promptName = document.createElement('div');
        promptName.className = 'prompt-item-name';
        promptName.textContent = prompt.name || 'Unnamed Prompt';
        promptItem.appendChild(promptName);
        
        // Create delete button
        const deleteIcon = document.createElement('button');
        deleteIcon.className = 'prompt-item-delete';
        deleteIcon.innerHTML = '<i class="fas fa-trash"></i>';
        deleteIcon.title = 'Delete prompt';
        
        // Disable delete button for MCP prompts
        if (prompt.isMcpPrompt) {
            deleteIcon.disabled = true;
            deleteIcon.style.opacity = '0.3';
            deleteIcon.style.cursor = 'not-allowed';
            deleteIcon.title = 'Disconnect Shodan MCP Server to delete prompt';
        }
        
        promptItem.appendChild(deleteIcon);
        
        return promptItem;
    }
    
    /**
     * Render a default prompt item
     * @param {Object} prompt - Default prompt object
     * @param {boolean} isSelected - Whether prompt is selected
     * @returns {HTMLElement} Default prompt item element
     */
    function renderDefaultPromptItem(prompt, isSelected) {
        const promptItem = document.createElement('div');
        promptItem.className = 'prompt-item default-prompt-item';
        promptItem.dataset.promptId = prompt.id;
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'prompt-item-checkbox';
        checkbox.checked = isSelected;
        promptItem.appendChild(checkbox);
        
        // Create prompt name (clickable for viewing content)
        const promptName = document.createElement('div');
        promptName.className = 'prompt-item-name';
        promptName.textContent = prompt.name || 'Unnamed Default Prompt';
        promptName.style.cursor = 'pointer';
        promptName.title = 'Click to view prompt content';
        promptItem.appendChild(promptName);
        
        // Create info button instead of delete
        const infoIcon = document.createElement('button');
        infoIcon.className = 'prompt-item-info';
        infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
        infoIcon.title = 'About this prompt';
        promptItem.appendChild(infoIcon);
        
        return promptItem;
    }
    
    /**
     * Render a section header with expand/collapse functionality
     * @param {string} title - Section title
     * @param {string} iconClass - CSS class for the expand/collapse icon
     * @returns {HTMLElement} Section header element
     */
    function renderSectionHeader(title, iconClass = 'fas fa-chevron-right') {
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'default-prompts-header';
        
        // Add expand/collapse icon
        const expandIcon = document.createElement('i');
        expandIcon.className = iconClass;
        sectionHeader.appendChild(expandIcon);
        
        // Add section title
        const sectionTitle = document.createElement('h4');
        sectionTitle.textContent = title;
        sectionHeader.appendChild(sectionTitle);
        
        return sectionHeader;
    }
    
    /**
     * Render a nested section header
     * @param {string} title - Section title  
     * @returns {HTMLElement} Nested section header element
     */
    function renderNestedSectionHeader(title) {
        const nestedHeader = document.createElement('div');
        nestedHeader.className = 'nested-section-header';
        
        // Add expand/collapse icon
        const nestedExpandIcon = document.createElement('i');
        nestedExpandIcon.className = 'fas fa-chevron-right';
        nestedHeader.appendChild(nestedExpandIcon);
        
        // Add title
        const nestedTitle = document.createElement('h4');
        nestedTitle.textContent = title || 'Unnamed Section';
        nestedHeader.appendChild(nestedTitle);
        
        return nestedHeader;
    }
    
    /**
     * Render the default prompts section
     * @param {Array} defaultPrompts - Array of default prompt objects
     * @param {Array} selectedIds - Array of selected prompt IDs
     * @returns {HTMLElement} Default prompts section element
     */
    function renderDefaultPromptsSection(defaultPrompts, selectedIds) {
        const defaultPromptsSection = document.createElement('div');
        defaultPromptsSection.className = 'default-prompts-section';
        
        // Create main section header
        const sectionHeader = renderSectionHeader('Default Prompts');
        defaultPromptsSection.appendChild(sectionHeader);
        
        // Create container for default prompts
        const defaultPromptsList = document.createElement('div');
        defaultPromptsList.className = 'default-prompts-list';
        defaultPromptsList.style.display = 'none'; // Initially collapsed
        
        // Add each default prompt to the list
        defaultPrompts.forEach(prompt => {
            if (prompt.isSection && prompt.items && prompt.items.length > 0) {
                // Create nested section
                const nestedSection = renderNestedSection(prompt, selectedIds);
                defaultPromptsList.appendChild(nestedSection);
            } else {
                // Regular prompt item
                const isSelected = selectedIds.includes(prompt.id);
                const promptItem = renderDefaultPromptItem(prompt, isSelected);
                defaultPromptsList.appendChild(promptItem);
            }
        });
        
        defaultPromptsSection.appendChild(defaultPromptsList);
        return defaultPromptsSection;
    }
    
    /**
     * Render a nested section with its items
     * @param {Object} sectionPrompt - Section prompt object
     * @param {Array} selectedIds - Array of selected prompt IDs
     * @returns {HTMLElement} Nested section element
     */
    function renderNestedSection(sectionPrompt, selectedIds) {
        const nestedSection = document.createElement('div');
        nestedSection.className = 'nested-section';
        
        // Create nested section header
        const nestedHeader = renderNestedSectionHeader(sectionPrompt.name);
        nestedSection.appendChild(nestedHeader);
        
        // Create container for nested items
        const nestedList = document.createElement('div');
        nestedList.className = 'nested-section-list';
        nestedList.style.display = 'none'; // Initially collapsed
        
        // Add each nested item
        sectionPrompt.items.forEach(nestedPrompt => {
            const isSelected = selectedIds.includes(nestedPrompt.id);
            const nestedItem = renderDefaultPromptItem(nestedPrompt, isSelected);
            nestedList.appendChild(nestedItem);
        });
        
        nestedSection.appendChild(nestedList);
        return nestedSection;
    }
    
    /**
     * Render the new prompt creation form
     * @returns {HTMLElement} New prompt section element
     */
    function renderNewPromptForm() {
        const newPromptSection = document.createElement('div');
        newPromptSection.className = 'new-prompt-section';
        
        // Label field
        const labelField = document.createElement('input');
        labelField.type = 'text';
        labelField.className = 'new-prompt-label';
        labelField.placeholder = 'New prompt label';
        labelField.id = 'new-prompt-label';
        
        // Content field
        const contentField = document.createElement('textarea');
        contentField.className = 'new-prompt-content';
        contentField.placeholder = 'Enter new prompt content here';
        contentField.id = 'new-prompt-content';
        contentField.rows = 6;
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'new-prompt-buttons';
        
        // Clear button
        const clearButton = document.createElement('button');
        clearButton.className = 'btn secondary-btn new-prompt-clear';
        clearButton.textContent = 'Clear';
        
        // Save button
        const saveButton = document.createElement('button');
        saveButton.className = 'btn primary-btn new-prompt-save';
        saveButton.textContent = 'Save Prompt';
        
        // Assemble the form
        newPromptSection.appendChild(labelField);
        newPromptSection.appendChild(contentField);
        buttonContainer.appendChild(clearButton);
        buttonContainer.appendChild(saveButton);
        newPromptSection.appendChild(buttonContainer);
        
        return newPromptSection;
    }
    
    /**
     * Render "no prompts" message
     * @returns {HTMLElement} No prompts message element
     */
    function renderNoPromptsMessage() {
        const noPromptsMessage = document.createElement('div');
        noPromptsMessage.className = 'no-prompts-message';
        noPromptsMessage.textContent = 'No saved prompts. Create one below.';
        return noPromptsMessage;
    }
    
    /**
     * Render info popup for default prompts
     * @param {Object} prompt - Prompt object
     * @returns {HTMLElement} Info popup element
     */
    function renderInfoPopup(prompt) {
        const popup = document.createElement('div');
        popup.className = 'prompt-info-popup';
        
        // Get description based on prompt ID
        let description = getPromptDescription(prompt.id);
        
        // Create popup content
        popup.innerHTML = `
            <div class="prompt-info-header">
                <h3>${prompt.name}</h3>
                <button class="prompt-info-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="prompt-info-content">
                <p>${description}</p>
                <p class="prompt-info-hint">Click on the prompt name to view its content in the editor.</p>
            </div>
        `;
        
        return popup;
    }
    
    /**
     * Get description for a prompt based on its ID
     * @param {string} promptId - Prompt ID
     * @returns {string} Prompt description
     */
    function getPromptDescription(promptId) {
        const descriptions = {
            'hacka-re-project': 'Information about the hacka.re project, including architecture. Markdown format.',
            'interpretability-urgency': 'Discusses the importance of AI interpretability research and its urgency for safe AI development.',
            'function-library': 'All JavaScript functions currently stored in <a href="#" class="function-library-link">Function Library</a>, for convenient LLM-assisted function updates.',
            'agent-orchestration': 'Demonstrates a pattern for creating multi-agent systems with function calling capabilities.',
            'owasp-llm-top10': 'The entire OWASP Top 10 for LLM applications as of May 2025. Markdown format, about 60 pages printed.',
            'mcp-sdk-readme': 'Documentation for the Model Context Protocol SDK, which enables communication between AI models and external tools.'
        };
        
        return descriptions[promptId] || 'A default system prompt component for the hacka.re chat interface.';
    }
    
    // Public API
    return {
        renderTokenUsageContainer,
        renderPromptItem,
        renderDefaultPromptItem,
        renderSectionHeader,
        renderNestedSectionHeader,
        renderDefaultPromptsSection,
        renderNestedSection,
        renderNewPromptForm,
        renderNoPromptsMessage,
        renderInfoPopup,
        getPromptDescription
    };
})();