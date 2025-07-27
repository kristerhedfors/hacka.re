/**
 * Namespace Selection Modal Manager
 * Handles the modal for selecting between existing namespaces or creating a new one
 * when entering a shared link with existing namespace data in localStorage
 */
class NamespaceSelectionModalManager {
    constructor() {
        this.modal = null;
        this.resolve = null;
        this.reject = null;
        this.namespaces = [];
        this.sharedLinkData = null;
        
        this.init();
    }

    init() {
        console.log('NamespaceSelectionModalManager: Initializing...');
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        // Create modal HTML structure
        const modalHTML = `
            <div id="namespace-selection-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Choose Namespace</h2>
                        <button type="button" class="close-btn" id="close-namespace-selection-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="namespace-explanation">
                            <p>We found existing namespaces that could be related to this shared link. You can:</p>
                            <ul>
                                <li><strong>Use existing namespace:</strong> Continue with your previous conversation data</li>
                                <li><strong>Create new namespace:</strong> Start fresh while keeping existing data separate</li>
                            </ul>
                        </div>
                        
                        <div class="namespace-list-container">
                            <h3>Existing Namespaces</h3>
                            <div id="namespace-list" class="namespace-list">
                                <!-- Populated by JavaScript -->
                            </div>
                        </div>
                        
                        <div class="namespace-actions">
                            <button type="button" class="btn primary-btn" id="use-selected-namespace" disabled>
                                Use Selected Namespace
                            </button>
                            <button type="button" class="btn secondary-btn" id="create-new-namespace-btn">
                                Create New Namespace
                            </button>
                            <button type="button" class="btn tertiary-btn" id="cancel-namespace-selection">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert modal into document
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('namespace-selection-modal');
    }

    bindEvents() {
        if (!this.modal) return;

        // Close button
        const closeBtn = this.modal.querySelector('#close-namespace-selection-modal');
        closeBtn?.addEventListener('click', () => this.cancel());

        // Cancel button
        const cancelBtn = this.modal.querySelector('#cancel-namespace-selection');
        cancelBtn?.addEventListener('click', () => this.cancel());

        // Use selected namespace button
        const useBtn = this.modal.querySelector('#use-selected-namespace');
        useBtn?.addEventListener('click', () => this.useSelectedNamespace());

        // Create new namespace button
        const createBtn = this.modal.querySelector('#create-new-namespace-btn');
        createBtn?.addEventListener('click', () => this.createNewNamespace());

        // Namespace list selection handling
        const namespaceList = this.modal.querySelector('#namespace-list');
        namespaceList?.addEventListener('click', (e) => this.handleNamespaceSelection(e));

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.cancel();
            }
        });
    }

    /**
     * Show the namespace selection modal
     * @param {Array} namespaces - Array of namespace objects with metadata
     * @param {Object} sharedLinkData - Decrypted shared link data
     * @returns {Promise} - Resolves with selected action and namespace info
     */
    show(namespaces, sharedLinkData) {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.namespaces = namespaces || [];
            this.sharedLinkData = sharedLinkData;

            this.populateNamespaceList();
            this.modal.style.display = 'block';
            
            console.log('NamespaceSelectionModalManager: Modal shown with', this.namespaces.length, 'namespaces');
        });
    }

    populateNamespaceList() {
        const namespaceList = this.modal.querySelector('#namespace-list');
        if (!namespaceList) return;

        if (this.namespaces.length === 0) {
            namespaceList.innerHTML = '<p class="no-namespaces">No existing namespaces found. You can create a new one.</p>';
            return;
        }

        const listHTML = this.namespaces.map(namespace => `
            <div class="namespace-item" data-namespace-id="${namespace.id}">
                <div class="namespace-header">
                    <h4 class="namespace-title">${this.escapeHtml(namespace.title || 'Untitled')}</h4>
                    <span class="namespace-id">${namespace.id}</span>
                </div>
                <div class="namespace-meta">
                    <span class="namespace-subtitle">${this.escapeHtml(namespace.subtitle || 'No subtitle')}</span>
                    <div class="namespace-stats">
                        <span class="stat">Messages: ${namespace.messageCount || 0}</span>
                        <span class="stat">Last used: ${this.formatDate(namespace.lastUsed)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        namespaceList.innerHTML = listHTML;
    }

    handleNamespaceSelection(e) {
        const namespaceItem = e.target.closest('.namespace-item');
        if (!namespaceItem) return;

        // Clear previous selections
        this.modal.querySelectorAll('.namespace-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Select clicked item
        namespaceItem.classList.add('selected');
        
        // Enable use button
        const useBtn = this.modal.querySelector('#use-selected-namespace');
        if (useBtn) {
            useBtn.disabled = false;
        }

        console.log('NamespaceSelectionModalManager: Selected namespace', namespaceItem.dataset.namespaceId);
    }

    useSelectedNamespace() {
        const selectedItem = this.modal.querySelector('.namespace-item.selected');
        if (!selectedItem) {
            console.warn('NamespaceSelectionModalManager: No namespace selected');
            return;
        }

        const namespaceId = selectedItem.dataset.namespaceId;
        const namespace = this.namespaces.find(ns => ns.id === namespaceId);
        
        if (!namespace) {
            console.error('NamespaceSelectionModalManager: Selected namespace not found');
            return;
        }

        console.log('NamespaceSelectionModalManager: Using existing namespace', namespaceId);
        this.hide();
        
        if (this.resolve) {
            this.resolve({
                action: 'use_existing',
                namespace: namespace,
                sharedLinkData: this.sharedLinkData
            });
        }
    }

    createNewNamespace() {
        console.log('NamespaceSelectionModalManager: Creating new namespace');
        this.hide();
        
        if (this.resolve) {
            this.resolve({
                action: 'create_new',
                namespace: null,
                sharedLinkData: this.sharedLinkData
            });
        }
    }

    cancel() {
        console.log('NamespaceSelectionModalManager: Cancelled');
        this.hide();
        
        if (this.reject) {
            this.reject(new Error('Namespace selection cancelled'));
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        
        // Reset state
        this.resolve = null;
        this.reject = null;
        this.namespaces = [];
        this.sharedLinkData = null;
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            
            return date.toLocaleDateString();
        } catch (e) {
            return 'Unknown';
        }
    }
}

// Initialize global instance
window.NamespaceSelectionModal = new NamespaceSelectionModalManager();

// Make available to ASCII tree menu
window.NamespaceSwitchModal = window.NamespaceSelectionModal;