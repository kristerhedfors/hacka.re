import { SHARE_CONFIG } from '../../config/share-config.js';
import { getShareItemRegistry } from '../../services/share-item-registry.js';

/**
 * Share UI Manager V2 - Registry-based implementation
 * Handles share-specific UI functionality using the new registry system
 */
export class ShareUIManagerV2 {
    constructor(elements) {
        this.elements = elements;
        this.registry = getShareItemRegistry();
        this.shareItems = new Map();
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the UI manager
     */
    initialize() {
        this.createShareItemInstances();
        this.setupEventListeners();
        console.log('ShareUIManagerV2 initialized');
    }

    /**
     * Create share item instances for UI management
     */
    createShareItemInstances() {
        const registeredItems = this.registry.getAll();
        
        for (const [id, config] of registeredItems) {
            try {
                const checkbox = document.getElementById(config.checkboxId);
                if (checkbox) {
                    this.shareItems.set(id, {
                        config,
                        checkbox,
                        element: checkbox
                    });
                } else {
                    console.warn(`Checkbox not found for share item '${id}': ${config.checkboxId}`);
                }
            } catch (error) {
                console.error(`Failed to create UI for share item '${id}':`, error);
            }
        }
    }

    /**
     * Setup event listeners for all share items
     */
    setupEventListeners() {
        for (const [id, item] of this.shareItems) {
            if (item.checkbox) {
                item.checkbox.addEventListener('change', () => {
                    this.onShareItemChange(id);
                });
            }
        }

        // Special handling for conversation checkbox
        const conversationItem = this.shareItems.get('conversation');
        if (conversationItem && conversationItem.checkbox) {
            conversationItem.checkbox.addEventListener('change', () => {
                this.toggleMessageHistoryInput();
            });
        }
    }

    /**
     * Handle share item checkbox changes
     * @param {string} itemId - ID of the changed item
     */
    onShareItemChange(itemId) {
        // Update link length bar
        this.updateLinkLengthBar();
        
        // Save share options
        this.saveShareOptions();
        
        console.log(`Share item '${itemId}' changed`);
    }

    /**
     * Initialize share modal UI
     * @param {Object} config - Configuration options
     */
    initializeShareModal(config) {
        const { apiKey, sessionKey, isSessionKeyLocked, loadShareOptions } = config;
        
        // Reset form
        if (this.elements.shareForm) {
            this.elements.shareForm.reset();
        }
        
        // Handle title and subtitle
        this.setupTitleAndSubtitle();
        
        // Handle password setup
        this.setupPassword(sessionKey, isSessionKeyLocked);
        
        // Load share options from storage
        if (loadShareOptions) {
            this.loadShareOptions();
        } else {
            this.setDefaultShareOptions();
        }
        
        // Hide generated link container
        if (this.elements.generatedLinkContainer) {
            this.elements.generatedLinkContainer.style.display = 'none';
        }
        
        // Clear QR code container
        if (this.elements.shareQrCodeContainer) {
            this.elements.shareQrCodeContainer.innerHTML = '';
        }
        
        // Hide QR code warning
        if (this.elements.qrCodeWarning) {
            this.elements.qrCodeWarning.style.display = 'none';
        }

        // Update link length bar
        this.updateLinkLengthBar();
    }

    /**
     * Setup title and subtitle inputs
     */
    setupTitleAndSubtitle() {
        const currentTitle = window.StorageService?.getTitle() || '';
        const currentSubtitle = window.StorageService?.getSubtitle() || '';
        const defaultTitle = "hacka.re";
        const defaultSubtitle = "Free, open, för hackare av hackare";
        
        // Set title input
        if (this.elements.shareTitleInput) {
            if (currentTitle === defaultTitle) {
                this.elements.shareTitleInput.value = '';
                this.elements.shareTitleInput.placeholder = defaultTitle;
            } else {
                this.elements.shareTitleInput.value = currentTitle;
            }
        }
        
        // Set subtitle input
        if (this.elements.shareSubtitleInput) {
            if (currentSubtitle === defaultSubtitle) {
                this.elements.shareSubtitleInput.value = '';
                this.elements.shareSubtitleInput.placeholder = defaultSubtitle;
            } else {
                this.elements.shareSubtitleInput.value = currentSubtitle;
            }
        }
    }

    /**
     * Setup password field
     * @param {string} sessionKey - Session key (if any)
     * @param {boolean} isSessionKeyLocked - Whether the session key is locked
     */
    setupPassword(sessionKey, isSessionKeyLocked) {
        if (sessionKey) {
            // Set the session key value
            if (this.elements.sharePassword) {
                this.elements.sharePassword.value = sessionKey;
                this.elements.sharePassword.readOnly = isSessionKeyLocked;
            }
            
            // Set the lock checkbox
            if (this.elements.lockSessionKeyCheckbox) {
                this.elements.lockSessionKeyCheckbox.checked = isSessionKeyLocked;
            }
            
            // Add or remove the locked class
            if (this.elements.passwordInputContainer) {
                if (isSessionKeyLocked) {
                    this.elements.passwordInputContainer.classList.add('locked');
                } else {
                    this.elements.passwordInputContainer.classList.remove('locked');
                }
            }
        } else {
            // Generate a random password only if there's no session key
            if (this.elements.sharePassword && window.ShareService) {
                this.elements.sharePassword.value = window.ShareService.generateStrongPassword();
                this.elements.sharePassword.type = 'password';
                this.elements.sharePassword.readOnly = false;
            }
            
            // Remove the locked class
            if (this.elements.passwordInputContainer) {
                this.elements.passwordInputContainer.classList.remove('locked');
            }
            
            // Ensure the lock checkbox is unchecked
            if (this.elements.lockSessionKeyCheckbox) {
                this.elements.lockSessionKeyCheckbox.checked = false;
            }
        }
    }

    /**
     * Set default share options using registry
     */
    setDefaultShareOptions() {
        for (const [id, item] of this.shareItems) {
            const config = this.registry.get(id);
            if (config && item.checkbox) {
                item.checkbox.checked = config.defaultChecked || false;
            }
        }

        // Special handling for message history
        if (this.elements.messageHistoryCount) {
            this.elements.messageHistoryCount.disabled = true;
            this.elements.messageHistoryCount.value = '10';
        }
        
        if (this.elements.messageHistoryContainer) {
            this.elements.messageHistoryContainer.classList.remove('active');
        }

        this.updateLinkLengthBar();
    }

    /**
     * Save share options to storage
     */
    saveShareOptions() {
        const options = {};
        
        for (const [id, item] of this.shareItems) {
            if (item.checkbox) {
                options[`include_${id}`] = item.checkbox.checked;
            }
        }
        
        // Save message count
        if (this.elements.messageHistoryCount) {
            options.messageCount = parseInt(this.elements.messageHistoryCount.value) || 10;
        }
        
        localStorage.setItem(SHARE_CONFIG.STORAGE_KEYS.SHARE_OPTIONS, JSON.stringify(options));
        console.log('Saved share options');
    }

    /**
     * Load share options from storage
     */
    loadShareOptions() {
        try {
            const optionsJson = localStorage.getItem(SHARE_CONFIG.STORAGE_KEYS.SHARE_OPTIONS);
            if (!optionsJson) {
                this.setDefaultShareOptions();
                return;
            }
            
            const options = JSON.parse(optionsJson);
            
            for (const [id, item] of this.shareItems) {
                const optionKey = `include_${id}`;
                if (options[optionKey] !== undefined && item.checkbox) {
                    item.checkbox.checked = options[optionKey];
                }
            }
            
            // Load message count
            if (options.messageCount && this.elements.messageHistoryCount) {
                this.elements.messageHistoryCount.value = options.messageCount;
            }
            
            // Update conversation input state
            this.toggleMessageHistoryInput();
            
            // Update link length bar
            this.updateLinkLengthBar();
            
            console.log('Loaded share options');
        } catch (error) {
            console.error('Failed to load share options:', error);
            this.setDefaultShareOptions();
        }
    }

    /**
     * Toggle message history input based on conversation checkbox
     */
    toggleMessageHistoryInput() {
        const conversationItem = this.shareItems.get('conversation');
        if (conversationItem && conversationItem.checkbox && 
            this.elements.messageHistoryCount && this.elements.messageHistoryContainer) {
            
            if (conversationItem.checkbox.checked) {
                this.elements.messageHistoryCount.disabled = false;
                this.elements.messageHistoryContainer.classList.add('active');
            } else {
                this.elements.messageHistoryCount.disabled = true;
                this.elements.messageHistoryContainer.classList.remove('active');
            }
        }
    }

    /**
     * Update the link length bar using registry-based calculation
     */
    async updateLinkLengthBar() {
        try {
            // Base URL length (including hash and shared= prefix)
            let estimatedLength = window.location.origin.length + 
                                 window.location.pathname.length + 8; // 8 for "#shared="
            
            // Calculate size for each selected item using registry
            for (const [id, item] of this.shareItems) {
                if (item.checkbox && item.checkbox.checked) {
                    try {
                        const config = this.registry.get(id);
                        if (config && config.estimateSize) {
                            const itemSize = await config.estimateSize();
                            estimatedLength += itemSize;
                        }
                    } catch (error) {
                        console.warn(`Failed to estimate size for '${id}':`, error);
                    }
                }
            }
            
            // Account for base64 encoding overhead
            estimatedLength = Math.ceil(estimatedLength * SHARE_CONFIG.ENCODING_OVERHEAD);
            
            // Add encryption overhead
            estimatedLength += SHARE_CONFIG.ENCRYPTION_OVERHEAD;
            
            // Update the link length text
            if (this.elements.linkLengthText) {
                this.elements.linkLengthText.textContent = estimatedLength;
            }
            
            // Calculate percentage of max recommended length
            const percentage = Math.min(100, Math.round((estimatedLength / SHARE_CONFIG.MAX_LINK_LENGTH) * 100));
            
            // Update the link length bar
            if (this.elements.linkLengthFill) {
                this.elements.linkLengthFill.style.width = `${percentage}%`;
                
                // Update color based on length
                const warningThreshold = SHARE_CONFIG.MAX_LINK_LENGTH * SHARE_CONFIG.LINK_WARNING_THRESHOLD;
                
                if (estimatedLength > SHARE_CONFIG.MAX_LINK_LENGTH) {
                    this.elements.linkLengthFill.classList.add('danger');
                    this.elements.linkLengthFill.classList.remove('warning');
                    if (this.elements.linkLengthWarning) {
                        this.elements.linkLengthWarning.style.display = 'block';
                        this.elements.linkLengthWarning.textContent = 
                            `Link is too long (${estimatedLength} bytes). Consider reducing the amount of shared data.`;
                    }
                } else if (estimatedLength > warningThreshold) {
                    this.elements.linkLengthFill.classList.add('warning');
                    this.elements.linkLengthFill.classList.remove('danger');
                    if (this.elements.linkLengthWarning) {
                        this.elements.linkLengthWarning.style.display = 'block';
                        this.elements.linkLengthWarning.textContent = 
                            `Link is getting long (${estimatedLength} bytes). Consider QR code limitations.`;
                    }
                } else {
                    this.elements.linkLengthFill.classList.remove('danger', 'warning');
                    if (this.elements.linkLengthWarning) {
                        this.elements.linkLengthWarning.style.display = 'none';
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to update link length bar:', error);
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility() {
        if (this.elements.sharePassword && this.elements.togglePasswordVisibilityBtn) {
            if (this.elements.sharePassword.type === 'password') {
                this.elements.sharePassword.type = 'text';
                this.elements.togglePasswordVisibilityBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                this.elements.sharePassword.type = 'password';
                this.elements.togglePasswordVisibilityBtn.innerHTML = '<i class="fas fa-eye"></i>';
            }
        }
    }

    /**
     * Generate a QR code for the share link
     * @param {string} link - The link to encode in the QR code
     */
    generateShareQRCode(link) {
        if (this.elements.shareQrCodeContainer && link) {
            try {
                // Clear any existing QR code
                this.elements.shareQrCodeContainer.innerHTML = '';
                
                // Check if the link is too long for QR code generation
                if (link.length > SHARE_CONFIG.MAX_QR_LENGTH) {
                    // Show warning
                    if (this.elements.qrCodeWarning) {
                        this.elements.qrCodeWarning.textContent = 
                            `The link is too long (${link.length} bytes) to generate a QR code. QR codes can typically handle up to ${SHARE_CONFIG.MAX_QR_LENGTH} bytes.`;
                        this.elements.qrCodeWarning.style.display = 'block';
                    }
                    return;
                }
                
                // Create a new QR code
                if (window.QRCode) {
                    new window.QRCode(this.elements.shareQrCodeContainer, {
                        text: link,
                        width: 250,
                        height: 250,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: window.QRCode.CorrectLevel.L
                    });
                } else {
                    console.warn('QRCode library not available');
                }
            } catch (error) {
                console.error('Error generating QR code:', error);
                
                // Show warning
                if (this.elements.qrCodeWarning) {
                    this.elements.qrCodeWarning.textContent = 'Error generating QR code. The link may be too long.';
                    this.elements.qrCodeWarning.style.display = 'block';
                }
            }
        }
    }

    /**
     * Get selected share items summary
     * @returns {Object} Summary of selected items
     */
    getSelectedSummary() {
        const selected = [];
        const sensitive = [];
        
        for (const [id, item] of this.shareItems) {
            if (item.checkbox && item.checkbox.checked) {
                const config = this.registry.get(id);
                selected.push({
                    id,
                    label: config.label,
                    sensitive: config.isSensitive
                });
                
                if (config.isSensitive) {
                    sensitive.push(id);
                }
            }
        }
        
        return {
            selectedItems: selected,
            sensitiveItems: sensitive,
            totalSelected: selected.length,
            totalSensitive: sensitive.length
        };
    }

    /**
     * Validate all selected items
     * @returns {Promise<Array<string>>} Array of validation errors
     */
    async validateSelectedItems() {
        const errors = [];
        
        for (const [id, item] of this.shareItems) {
            if (item.checkbox && item.checkbox.checked) {
                try {
                    const config = this.registry.get(id);
                    if (config && config.collectData) {
                        const data = await config.collectData();
                        if (data === null || data === undefined) {
                            errors.push(`No data available for ${config.label}`);
                        }
                    }
                } catch (error) {
                    errors.push(`Failed to validate ${id}: ${error.message}`);
                }
            }
        }
        
        return errors;
    }

    /**
     * Dispose of the UI manager
     */
    dispose() {
        // Remove event listeners
        for (const [id, item] of this.shareItems) {
            if (item.checkbox) {
                // Clone and replace to remove all event listeners
                const newCheckbox = item.checkbox.cloneNode(true);
                item.checkbox.parentNode.replaceChild(newCheckbox, item.checkbox);
            }
        }
        
        this.shareItems.clear();
        console.log('ShareUIManagerV2 disposed');
    }
}