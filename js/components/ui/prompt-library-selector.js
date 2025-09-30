/**
 * Prompt Library Selector
 * Handles sophisticated prompt library modal with live search and keyboard shortcuts
 * Similar to ModelSelectionManager but for OpenAI Prompt Packs
 */

window.PromptLibrarySelector = (function() {

    let elements;
    let availablePrompts = [];
    let selectedPrompt = null;
    let currentSearchTerm = '';
    let highlightedIndex = -1;

    /**
     * Initialize the prompt library selector
     * @param {Object} domElements - DOM elements object
     */
    function init(domElements) {
        elements = domElements;
        setupEventListeners();
        console.log('🚀 PromptLibrarySelector initialized');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Modal close events
        if (elements.closePromptLibraryModal) {
            elements.closePromptLibraryModal.addEventListener('click', hideModal);
        }

        if (elements.promptLibraryCancel) {
            elements.promptLibraryCancel.addEventListener('click', hideModal);
        }

        // Library button click
        if (elements.promptLibraryBtn) {
            elements.promptLibraryBtn.addEventListener('click', showModal);
        }

        // Search input events
        if (elements.promptLibrarySearchInput) {
            elements.promptLibrarySearchInput.addEventListener('input', handleSearchInput);
            elements.promptLibrarySearchInput.addEventListener('keydown', handleSearchKeydown);
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', handleGlobalKeydown);

        // Click outside to close
        if (elements.promptLibraryModal) {
            elements.promptLibraryModal.addEventListener('click', (e) => {
                if (e.target === elements.promptLibraryModal) {
                    hideModal();
                }
            });
        }
    }

    /**
     * Handle global keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleGlobalKeydown(e) {
        // Cmd+L on Mac or Ctrl+L on Windows/Linux (L for Library)
        if ((e.metaKey || e.ctrlKey) && e.key === 'l' && !e.shiftKey) {
            // Don't interfere if typing in an input
            if (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            e.preventDefault();
            if (isModalVisible()) {
                hideModal();
            } else {
                showModal();
            }
            return;
        }

        // Escape to close modal
        if (e.key === 'Escape' && isModalVisible()) {
            e.preventDefault();
            hideModal();
            return;
        }

        // Handle navigation in modal
        if (isModalVisible() && !e.defaultPrevented) {
            handleModalKeyboard(e);
        }
    }

    /**
     * Handle keyboard navigation in modal
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleModalKeyboard(e) {
        const visiblePrompts = getVisiblePrompts();

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, visiblePrompts.length - 1);
            updateHighlight();
            scrollToHighlighted();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, -1);
            updateHighlight();
            scrollToHighlighted();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < visiblePrompts.length) {
                selectPromptAtIndex(highlightedIndex);
            }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Focus search input and add character
            if (elements.promptLibrarySearchInput &&
                document.activeElement !== elements.promptLibrarySearchInput) {
                elements.promptLibrarySearchInput.focus();
            }
        }
    }

    /**
     * Handle search input changes
     * @param {Event} e - Input event
     */
    function handleSearchInput(e) {
        currentSearchTerm = e.target.value.toLowerCase();
        filterPrompts();
        highlightedIndex = currentSearchTerm ? 0 : -1;
        updateHighlight();
    }

    /**
     * Handle search input keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleSearchKeydown(e) {
        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            handleModalKeyboard(e);
        }
    }

    /**
     * Show the prompt library modal
     */
    function showModal() {
        console.log('🔧 Opening prompt library modal');

        if (!elements.promptLibraryModal) {
            console.error('❌ Prompt library modal not found');
            return;
        }

        elements.promptLibraryModal.classList.add('active');
        resetModalState();

        // Focus search input
        if (elements.promptLibrarySearchInput) {
            setTimeout(() => {
                elements.promptLibrarySearchInput.focus();
            }, 100);
        }

        loadAvailablePrompts();
    }

    /**
     * Hide the prompt library modal
     */
    function hideModal() {
        console.log('🔧 Closing prompt library modal');

        if (elements.promptLibraryModal) {
            elements.promptLibraryModal.classList.remove('active');
        }

        resetModalState();

        // Focus the message input after modal closes
        setTimeout(() => {
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.focus();
            }
        }, 100);
    }

    /**
     * Check if modal is visible
     * @returns {boolean} True if modal is visible
     */
    function isModalVisible() {
        return elements.promptLibraryModal &&
               elements.promptLibraryModal.classList.contains('active');
    }

    /**
     * Reset modal state
     */
    function resetModalState() {
        currentSearchTerm = '';
        highlightedIndex = -1;
        selectedPrompt = null;

        if (elements.promptLibrarySearchInput) {
            elements.promptLibrarySearchInput.value = '';
        }
    }

    /**
     * Load available prompts from OpenAI Prompt Packs
     */
    function loadAvailablePrompts() {
        console.log('🔧 Loading available prompts...');

        availablePrompts = [];

        // Get OpenAI Prompt Packs section
        if (window.OpenAIPromptPacksSection && window.OpenAIPromptPacksSection.items) {
            // Recursively extract all prompts from nested sections
            extractPromptsFromSection(window.OpenAIPromptPacksSection.items);
        }

        console.log(`✅ Loaded ${availablePrompts.length} prompts`);
        renderPrompts();
    }

    /**
     * Recursively extract prompts from nested sections
     * @param {Array} items - Array of section items
     * @param {string} parentName - Parent section name for breadcrumb
     */
    function extractPromptsFromSection(items, parentName = '') {
        items.forEach(item => {
            if (item.isSection && item.items && item.items.length > 0) {
                // This is a section, recurse into it
                const sectionName = parentName ? `${parentName} > ${item.name}` : item.name;
                extractPromptsFromSection(item.items, sectionName);
            } else if (item.content && item.name) {
                // This is an actual prompt
                availablePrompts.push({
                    id: item.id,
                    name: item.name,
                    shortDesc: item.shortDesc || item.description || '',
                    content: item.content,
                    collection: parentName || 'General'
                });
            }
        });
    }

    /**
     * Render prompts in the list
     */
    function renderPrompts() {
        if (!elements.promptLibraryListContainer) return;

        if (availablePrompts.length === 0) {
            elements.promptLibraryListContainer.innerHTML =
                '<div class="no-models-found">No prompts found</div>';
            return;
        }

        let html = '';
        availablePrompts.forEach((prompt, index) => {
            const classes = ['model-item', 'prompt-item'];

            html += `
                <div class="${classes.join(' ')}" data-prompt-id="${prompt.id}" data-index="${index}">
                    <div style="flex: 1;">
                        <div class="model-name">${escapeHtml(prompt.name)}</div>
                        <div class="model-provider">${escapeHtml(prompt.collection)}</div>
                        ${prompt.shortDesc ? `<div class="prompt-short-desc">${escapeHtml(prompt.shortDesc)}</div>` : ''}
                    </div>
                    <button class="icon-btn prompt-info-btn" data-prompt-id="${prompt.id}" title="View full prompt">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            `;
        });

        elements.promptLibraryListContainer.innerHTML = html;

        // Add click listeners to prompt items
        elements.promptLibraryListContainer.querySelectorAll('.prompt-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking info button
                if (e.target.closest('.prompt-info-btn')) {
                    return;
                }

                const promptId = item.dataset.promptId;
                const prompt = availablePrompts.find(p => p.id === promptId);

                if (prompt) {
                    const visibleItems = elements.promptLibraryListContainer
                        .querySelectorAll('.prompt-item:not(.filtered-out)');
                    const visibleIndex = Array.from(visibleItems).indexOf(item);

                    highlightedIndex = visibleIndex;
                    updateHighlight();

                    selectedPrompt = prompt;
                    selectPrompt();
                }
            });
        });

        // Add click listeners to info buttons
        elements.promptLibraryListContainer.querySelectorAll('.prompt-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const promptId = btn.dataset.promptId;
                const prompt = availablePrompts.find(p => p.id === promptId);
                if (prompt) {
                    showPromptInfo(prompt);
                }
            });
        });
    }

    /**
     * Show full prompt info in an alert-style modal
     * @param {Object} prompt - Prompt object
     */
    function showPromptInfo(prompt) {
        const infoText = `${prompt.name}\n\nCollection: ${prompt.collection}\n\n${prompt.shortDesc ? prompt.shortDesc + '\n\n' : ''}Full Prompt:\n${prompt.content}\n\nClick a prompt or press Enter to populate the chat input with this prompt.`;

        alert(infoText);
    }

    /**
     * Filter prompts based on search term
     * Only searches visible fields: name, collection (category), and short description
     */
    function filterPrompts() {
        if (!elements.promptLibraryListContainer) return;

        const promptItems = elements.promptLibraryListContainer.querySelectorAll('.prompt-item');
        let visibleCount = 0;

        promptItems.forEach((item, index) => {
            const prompt = availablePrompts[index];
            if (!prompt) return;

            const searchText = currentSearchTerm.toLowerCase();
            // Only match against visible fields (name, collection, shortDesc)
            // NOT the actual prompt content which is not displayed
            const matches = !searchText ||
                           prompt.name.toLowerCase().includes(searchText) ||
                           prompt.collection.toLowerCase().includes(searchText) ||
                           (prompt.shortDesc && prompt.shortDesc.toLowerCase().includes(searchText));

            if (matches) {
                item.classList.remove('filtered-out');
                item.style.display = '';
                highlightMatchingText(item, searchText);
                visibleCount++;
            } else {
                item.classList.add('filtered-out');
                item.style.display = 'none';
            }
        });

        // Show "no results" if no matches
        if (visibleCount === 0 && currentSearchTerm) {
            if (!elements.promptLibraryListContainer.querySelector('.no-models-found')) {
                const noResults = document.createElement('div');
                noResults.className = 'no-models-found';
                noResults.textContent = `No prompts found matching "${currentSearchTerm}"`;
                elements.promptLibraryListContainer.appendChild(noResults);
            }
        } else {
            const noResults = elements.promptLibraryListContainer.querySelector('.no-models-found');
            if (noResults) {
                noResults.remove();
            }
        }
    }

    /**
     * Highlight matching text in prompt items
     * Highlights matches in name, collection (category), and short description
     * @param {HTMLElement} item - Prompt item element
     * @param {string} searchText - Search term
     */
    function highlightMatchingText(item, searchText) {
        if (!searchText) return;

        const regex = new RegExp(`(${escapeRegExp(searchText)})`, 'gi');

        // Highlight in prompt name
        const modelNameEl = item.querySelector('.model-name');
        if (modelNameEl) {
            const originalText = modelNameEl.textContent;
            const highlightedText = originalText.replace(regex, '<span class="highlight">$1</span>');
            modelNameEl.innerHTML = highlightedText;
        }

        // Highlight in collection (category)
        const collectionEl = item.querySelector('.model-provider');
        if (collectionEl) {
            const originalText = collectionEl.textContent;
            const highlightedText = originalText.replace(regex, '<span class="highlight">$1</span>');
            collectionEl.innerHTML = highlightedText;
        }

        // Highlight in short description
        const shortDescEl = item.querySelector('.prompt-short-desc');
        if (shortDescEl) {
            const originalText = shortDescEl.textContent;
            const highlightedText = originalText.replace(regex, '<span class="highlight">$1</span>');
            shortDescEl.innerHTML = highlightedText;
        }
    }

    /**
     * Get visible (non-filtered) prompts
     * @returns {Array} Array of visible prompt objects
     */
    function getVisiblePrompts() {
        if (!elements.promptLibraryListContainer) return [];

        const visibleItems = elements.promptLibraryListContainer
            .querySelectorAll('.prompt-item:not(.filtered-out)');
        return Array.from(visibleItems).map(item => {
            const index = parseInt(item.dataset.index);
            return availablePrompts[index];
        }).filter(Boolean);
    }

    /**
     * Update highlight for current selection
     */
    function updateHighlight() {
        if (!elements.promptLibraryListContainer) return;

        const visibleItems = elements.promptLibraryListContainer
            .querySelectorAll('.prompt-item:not(.filtered-out)');

        // Remove previous highlight
        visibleItems.forEach(item => item.classList.remove('highlighted'));

        // Add highlight to current item
        if (highlightedIndex >= 0 && highlightedIndex < visibleItems.length) {
            visibleItems[highlightedIndex].classList.add('highlighted');
            selectedPrompt = availablePrompts[parseInt(visibleItems[highlightedIndex].dataset.index)];
        } else {
            selectedPrompt = null;
        }
    }

    /**
     * Scroll to highlighted item
     */
    function scrollToHighlighted() {
        if (!elements.promptLibraryListContainer || highlightedIndex < 0) return;

        const visibleItems = elements.promptLibraryListContainer
            .querySelectorAll('.prompt-item:not(.filtered-out)');
        if (highlightedIndex < visibleItems.length) {
            const item = visibleItems[highlightedIndex];
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    /**
     * Select prompt at specific index
     * @param {number} index - Index in visible prompts list
     */
    function selectPromptAtIndex(index) {
        const visibleItems = elements.promptLibraryListContainer
            .querySelectorAll('.prompt-item:not(.filtered-out)');
        if (index >= 0 && index < visibleItems.length) {
            const item = visibleItems[index];
            const promptId = item.dataset.promptId;
            const prompt = availablePrompts.find(p => p.id === promptId);

            if (prompt) {
                selectedPrompt = prompt;
                selectPrompt();
            }
        }
    }

    /**
     * Select the current prompt and populate chat input
     */
    function selectPrompt() {
        if (!selectedPrompt) {
            console.log('❌ No prompt selected');
            return;
        }

        console.log('🔧 Selecting prompt:', selectedPrompt.name);

        try {
            // Populate the chat input with the prompt content
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.value = selectedPrompt.content;

                // Trigger input event to resize textarea if needed
                const inputEvent = new Event('input', { bubbles: true });
                messageInput.dispatchEvent(inputEvent);

                // Focus the input
                messageInput.focus();
            }

            console.log('✅ Prompt populated to chat input');
            hideModal();

        } catch (error) {
            console.error('❌ Error selecting prompt:', error);
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escape regex special characters
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Public API
    return {
        init: init,
        showModal: showModal,
        hideModal: hideModal,
        isModalVisible: isModalVisible
    };
})();