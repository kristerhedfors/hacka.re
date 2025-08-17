/**
 * RAG User Bundles Handler
 * Handles loading and management of user-defined knowledge base bundles from hackare tool
 */

window.RAGUserBundles = (function() {
    
    /**
     * Load bundle from file
     * @param {File} file - Bundle file to load
     * @returns {Promise<Object>} Loaded bundle data
     */
    async function loadBundleFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            // Check file type
            if (!file.name.endsWith('.json')) {
                reject(new Error('Bundle files must be JSON format'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const bundleData = JSON.parse(e.target.result);
                    
                    // Validate bundle structure
                    const validationResult = validateBundle(bundleData);
                    if (!validationResult.isValid) {
                        reject(new Error(`Invalid bundle format: ${validationResult.errors.join(', ')}`));
                        return;
                    }
                    
                    resolve(bundleData);
                } catch (error) {
                    reject(new Error(`Failed to parse bundle file: ${error.message}`));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read bundle file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Validate bundle structure
     * @param {Object} bundleData - Bundle data to validate
     * @returns {Object} Validation result
     */
    function validateBundle(bundleData) {
        const errors = [];
        
        if (!bundleData || typeof bundleData !== 'object') {
            errors.push('Bundle must be a valid JSON object');
        }
        
        if (!bundleData.chunks || !Array.isArray(bundleData.chunks)) {
            errors.push('Bundle must contain a chunks array');
        }
        
        if (!bundleData.files || !Array.isArray(bundleData.files)) {
            errors.push('Bundle must contain a files array');
        }
        
        if (!bundleData.metadata || typeof bundleData.metadata !== 'object') {
            errors.push('Bundle must contain metadata object');
        }
        
        // Validate chunks structure
        if (bundleData.chunks && Array.isArray(bundleData.chunks)) {
            for (let i = 0; i < bundleData.chunks.length; i++) {
                const chunk = bundleData.chunks[i];
                
                if (!chunk.content || typeof chunk.content !== 'string') {
                    errors.push(`Chunk ${i}: missing or invalid content`);
                }
                
                if (!chunk.embedding || !Array.isArray(chunk.embedding)) {
                    errors.push(`Chunk ${i}: missing or invalid embedding`);
                }
                
                if (!chunk.metadata || typeof chunk.metadata !== 'object') {
                    errors.push(`Chunk ${i}: missing or invalid metadata`);
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Create file input for bundle upload
     * @param {Function} onLoad - Callback when bundle is loaded
     * @param {Function} onError - Callback when error occurs
     * @returns {HTMLInputElement} File input element
     */
    function createBundleFileInput(onLoad, onError) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.multiple = false;
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const bundleData = await loadBundleFromFile(file);
                
                // Add bundle metadata
                bundleData.name = bundleData.name || file.name.replace('.json', '');
                bundleData.loadedAt = new Date().toISOString();
                bundleData.fileName = file.name;
                bundleData.fileSize = file.size;
                
                if (onLoad) {
                    onLoad(bundleData);
                }
            } catch (error) {
                console.error('RAGUserBundles: Error loading bundle:', error);
                if (onError) {
                    onError(error);
                }
            }
        });
        
        return input;
    }

    /**
     * Add bundle to storage
     * @param {Object} bundleData - Bundle data to add
     * @returns {boolean} Success status
     */
    function addBundle(bundleData) {
        try {
            // Load existing bundles
            let userBundles = RAGStorageService.loadUserBundlesIndex();
            if (!userBundles) {
                userBundles = {
                    bundles: [],
                    metadata: {
                        version: '1.0',
                        createdAt: new Date().toISOString()
                    }
                };
            }
            
            // Add new bundle
            userBundles.bundles.push(bundleData);
            userBundles.metadata.lastUpdated = new Date().toISOString();
            
            // Save to storage
            return RAGStorageService.saveUserBundlesIndex(userBundles);
        } catch (error) {
            console.error('RAGUserBundles: Error adding bundle:', error);
            return false;
        }
    }

    /**
     * Remove bundle from storage
     * @param {string} bundleName - Name of bundle to remove
     * @returns {boolean} Success status
     */
    function removeBundle(bundleName) {
        try {
            const userBundles = RAGStorageService.loadUserBundlesIndex();
            if (!userBundles || !userBundles.bundles) {
                return false;
            }
            
            // Filter out the bundle
            userBundles.bundles = userBundles.bundles.filter(bundle => bundle.name !== bundleName);
            userBundles.metadata.lastUpdated = new Date().toISOString();
            
            // Save updated bundles
            return RAGStorageService.saveUserBundlesIndex(userBundles);
        } catch (error) {
            console.error('RAGUserBundles: Error removing bundle:', error);
            return false;
        }
    }

    /**
     * Get all loaded bundles
     * @returns {Array} Array of loaded bundles
     */
    function getBundles() {
        try {
            const userBundles = RAGStorageService.loadUserBundlesIndex();
            return userBundles ? userBundles.bundles : [];
        } catch (error) {
            console.error('RAGUserBundles: Error getting bundles:', error);
            return [];
        }
    }

    /**
     * Get bundle statistics
     * @returns {Object} Bundle statistics
     */
    function getBundleStats() {
        const bundles = getBundles();
        let totalChunks = 0;
        let totalFiles = 0;
        
        bundles.forEach(bundle => {
            if (bundle.chunks && Array.isArray(bundle.chunks)) {
                totalChunks += bundle.chunks.length;
            }
            if (bundle.files && Array.isArray(bundle.files)) {
                totalFiles += bundle.files.length;
            }
        });
        
        return {
            bundleCount: bundles.length,
            totalChunks: totalChunks,
            totalFiles: totalFiles,
            bundles: bundles.map(bundle => ({
                name: bundle.name,
                chunks: bundle.chunks ? bundle.chunks.length : 0,
                files: bundle.files ? bundle.files.length : 0,
                loadedAt: bundle.loadedAt,
                model: bundle.metadata ? bundle.metadata.model : 'Unknown'
            }))
        };
    }

    /**
     * Create bundle display element
     * @param {Object} bundle - Bundle data
     * @param {Function} onRemove - Remove callback
     * @returns {HTMLElement} Bundle display element
     */
    function createBundleDisplayElement(bundle, onRemove) {
        const bundleElement = document.createElement('div');
        bundleElement.className = 'rag-bundle-item';
        
        const chunkCount = bundle.chunks ? bundle.chunks.length : 0;
        const fileCount = bundle.files ? bundle.files.length : 0;
        const model = bundle.metadata ? bundle.metadata.model : 'Unknown';
        
        bundleElement.innerHTML = `
            <div class="rag-bundle-info">
                <div class="rag-bundle-name">${bundle.name || 'Unnamed Bundle'}</div>
                <div class="rag-bundle-stats">
                    ${chunkCount} chunks from ${fileCount} files • Model: ${model}
                </div>
            </div>
            <div class="rag-bundle-actions">
                <button type="button" class="btn secondary-btn rag-remove-bundle-btn" title="Remove bundle">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add remove functionality
        const removeBtn = bundleElement.querySelector('.rag-remove-bundle-btn');
        if (removeBtn && onRemove) {
            removeBtn.addEventListener('click', () => {
                if (confirm(`Remove bundle "${bundle.name}"? This cannot be undone.`)) {
                    onRemove(bundle.name);
                }
            });
        }
        
        return bundleElement;
    }

    /**
     * Export bundle to file
     * @param {string} bundleName - Name of bundle to export
     */
    function exportBundle(bundleName) {
        try {
            const bundles = getBundles();
            const bundle = bundles.find(b => b.name === bundleName);
            
            if (!bundle) {
                throw new Error('Bundle not found');
            }
            
            // Create download
            const dataStr = JSON.stringify(bundle, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(dataBlob);
            downloadLink.download = `${bundleName}.json`;
            downloadLink.click();
            
            URL.revokeObjectURL(downloadLink.href);
        } catch (error) {
            console.error('RAGUserBundles: Error exporting bundle:', error);
            throw error;
        }
    }

    // Public API
    return {
        loadBundleFromFile,
        validateBundle,
        createBundleFileInput,
        addBundle,
        removeBundle,
        getBundles,
        getBundleStats,
        createBundleDisplayElement,
        exportBundle
    };
})();