/**
 * RAG User Bundles Manager
 * Manages user bundle display, upload, and removal functionality
 */

window.RAGUserBundlesManager = (function() {
    
    let isInitialized = false;

    /**
     * Initialize the RAG User Bundles Manager
     */
    function init() {
        if (isInitialized) {
            return;
        }

        setupEventListeners();
        isInitialized = true;
        console.log('RAGUserBundlesManager: Initialized successfully');
    }

    /**
     * Set up event listeners for bundle functionality
     */
    function setupEventListeners() {
        // Upload bundle button
        const uploadBtn = document.getElementById('rag-upload-bundle-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', uploadBundle);
        }
    }

    /**
     * Load and display user bundles list
     */
    function loadBundlesList() {
        const listContainer = document.getElementById('rag-user-bundles-list');
        if (!listContainer) return;

        try {
            const bundleStats = RAGUserBundles.getBundleStats();
            
            if (bundleStats.bundleCount === 0) {
                listContainer.innerHTML = `
                    <div class="empty-bundles-state">
                        <p>No knowledge base bundles loaded. Use the hackare tool to create custom bundles.</p>
                    </div>
                `;
                return;
            }

            // Create bundle display elements
            const bundlesHTML = bundleStats.bundles.map(bundle => {
                return createBundleHTML(bundle);
            }).join('');

            listContainer.innerHTML = bundlesHTML;

        } catch (error) {
            console.error('RAGUserBundlesManager: Error loading user bundles list:', error);
            listContainer.innerHTML = '<p class="rag-error">Error loading user bundles.</p>';
        }
    }

    /**
     * Create HTML for a single bundle
     * @param {Object} bundle - Bundle data
     * @returns {string} Bundle HTML
     */
    function createBundleHTML(bundle) {
        return `
            <div class="rag-bundle-item">
                <div class="rag-bundle-info">
                    <div class="rag-bundle-name">${bundle.name}</div>
                    <div class="rag-bundle-stats">
                        ${bundle.chunks} chunks from ${bundle.files} files • Model: ${bundle.model}
                    </div>
                </div>
                <div class="rag-bundle-actions">
                    <button type="button" class="btn secondary-btn" onclick="RAGUserBundlesManager.removeBundle('${bundle.name}')" title="Remove bundle">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Upload bundle functionality
     */
    function uploadBundle() {
        // Create file input for bundle upload
        const fileInput = RAGUserBundles.createBundleFileInput(
            (bundleData) => {
                // Successfully loaded bundle
                try {
                    if (RAGUserBundles.addBundle(bundleData)) {
                        showSuccess(`Successfully loaded bundle "${bundleData.name}" with ${bundleData.chunks.length} chunks`);
                        VectorRAGService.reloadIndexes();
                        
                        // Update UI components
                        loadBundlesList();
                        if (window.RAGIndexStatsManager) {
                            window.RAGIndexStatsManager.updateStats();
                        }
                    } else {
                        showError('Failed to save bundle to storage');
                    }
                } catch (error) {
                    showError(`Failed to add bundle: ${error.message}`);
                }
            },
            (error) => {
                // Error loading bundle
                showError(`Failed to load bundle: ${error.message}`);
            }
        );
        
        // Trigger file selection
        fileInput.click();
    }

    /**
     * Remove user bundle
     * @param {string} bundleName - Name of bundle to remove
     */
    function removeBundle(bundleName) {
        if (!confirm(`Remove bundle "${bundleName}"? This cannot be undone.`)) {
            return;
        }

        try {
            if (RAGUserBundles.removeBundle(bundleName)) {
                showSuccess(`Bundle "${bundleName}" removed successfully`);
                VectorRAGService.reloadIndexes();
                
                // Update UI components
                loadBundlesList();
                if (window.RAGIndexStatsManager) {
                    window.RAGIndexStatsManager.updateStats();
                }
            } else {
                showError('Failed to remove bundle');
            }
        } catch (error) {
            showError(`Failed to remove bundle: ${error.message}`);
        }
    }

    /**
     * Get bundle statistics
     * @returns {Object} Bundle statistics
     */
    function getBundleStats() {
        return RAGUserBundles.getBundleStats();
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    function showSuccess(message) {
        console.log('RAGUserBundlesManager Success:', message);
        if (showSuccess.lastMessage === message && Date.now() - showSuccess.lastTime < 1000) {
            return;
        }
        showSuccess.lastMessage = message;
        showSuccess.lastTime = Date.now();
        alert(`Success: ${message}`);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        console.error('RAGUserBundlesManager Error:', message);
        if (showError.lastMessage === message && Date.now() - showError.lastTime < 1000) {
            return;
        }
        showError.lastMessage = message;
        showError.lastTime = Date.now();
        alert(`Error: ${message}`);
    }

    // Public API
    return {
        init,
        loadBundlesList,
        uploadBundle,
        removeBundle,
        getBundleStats
    };
})();