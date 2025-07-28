/**
 * ASCII Tree Menu Library
 * A self-contained library for handling ASCII tree menus with expand/collapse and links
 */

class ASCIITreeMenu {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.init();
    }

    init() {
        if (!this.container) {
            console.warn('ASCII Tree Menu: Container not found');
            return;
        }

        console.log('ASCII Tree Menu: Initializing...');
        this.bindEvents();
    }

    bindEvents() {
        // Handle tree toggle clicks
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tree-toggle')) {
                e.stopPropagation(); // Prevent document click handler
                this.handleToggle(e.target);
            }
        });

        // Handle feature link clicks
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('feature-link')) {
                e.stopPropagation(); // Prevent document click handler
                this.handleFeatureLink(e.target);
            }
        });

        // Handle regular link clicks
        this.container.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                e.stopPropagation(); // Prevent document click handler
                // Let the browser handle the link naturally
            }
        });

        // Add touch support for mobile devices
        this.container.addEventListener('touchend', (e) => {
            // Handle specific elements and prevent event bubbling
            if (e.target.classList.contains('tree-toggle')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleToggle(e.target);
            } else if (e.target.classList.contains('feature-link')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleFeatureLink(e.target);
            } else if (e.target.tagName === 'A' || e.target.closest('a')) {
                // For links, prevent bubbling but allow normal navigation
                e.stopPropagation();
                const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                if (link.href) {
                    // Check if link should open in new tab
                    if (link.target === '_blank') {
                        // Open in new tab
                        window.open(link.href, '_blank', 'noopener,noreferrer');
                    } else {
                        // Manually navigate to prevent modal close
                        window.location.href = link.href;
                    }
                }
            }
        });

        console.log('ASCII Tree Menu: Events bound');
    }

    handleToggle(toggleElement) {
        const target = toggleElement.getAttribute('data-target');
        if (!target) return;

        const items = this.container.querySelectorAll('.' + target + '-item');
        const currentText = toggleElement.textContent;
        const isExpanded = currentText.includes('[−]') || currentText.includes('[-]');

        console.log('ASCII Tree Menu: Toggle clicked', { target, itemsFound: items.length, isExpanded });

        if (isExpanded) {
            // Collapse
            toggleElement.textContent = currentText.replace(/\[[\−\-]\]/, '[+]');
            items.forEach(item => item.style.display = 'none');
            console.log('ASCII Tree Menu: Collapsed');
        } else {
            // Expand
            toggleElement.textContent = currentText.replace('[+]', '[−]');
            items.forEach(item => item.style.display = 'block');
            console.log('ASCII Tree Menu: Expanded');
        }
    }

    handleFeatureLink(linkElement) {
        const feature = linkElement.getAttribute('data-feature');
        if (!feature) return;

        console.log('ASCII Tree Menu: Feature link clicked', feature);

        // Map features to their corresponding icon buttons
        const featureToButtonId = {
            'agents': 'agent-config-btn',
            'copy-chat': 'copy-chat-btn',
            'mcp-servers': 'mcp-servers-btn',
            'function-calling': 'function-btn',
            'system-prompts': 'prompts-btn',
            'share': 'share-btn',
            'theme': 'theme-toggle-btn',
            'settings': 'settings-btn'
        };

        // Handle namespace-specific features
        const namespaceFeatures = {
            'current-namespace': () => this.showCurrentNamespaceInfo(),
            'switch-namespace': () => this.showNamespaceSwitcher(),
            'create-namespace': () => this.createNewNamespace(),
            'delete-namespace': () => this.deleteCurrentNamespace()
        };

        // Check for namespace features first
        const namespaceAction = namespaceFeatures[feature];
        if (namespaceAction) {
            console.log('ASCII Tree Menu: Triggering namespace action for', feature);
            namespaceAction();
            return;
        }

        const buttonId = featureToButtonId[feature];
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                console.log('ASCII Tree Menu: Triggering button click for', buttonId);
                button.click();
                return;
            }
        }

        // Fallback actions if buttons don't exist
        const fallbackActions = {
            'copy-chat': () => this.copyChat(),
            'theme': () => this.cycleTheme()
        };

        const fallback = fallbackActions[feature];
        if (fallback) {
            fallback();
        } else {
            console.warn('ASCII Tree Menu: No button or fallback found for feature', feature);
        }
    }

    copyChat() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const textContent = Array.from(chatMessages.children)
                .map(msg => msg.textContent.trim())
                .filter(text => text.length > 0)
                .join('\n\n');
            
            navigator.clipboard.writeText(textContent).then(() => {
                console.log('ASCII Tree Menu: Chat copied to clipboard');
            }).catch(err => {
                console.error('ASCII Tree Menu: Failed to copy chat', err);
            });
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            console.log('ASCII Tree Menu: Opened modal', modalId);
        } else {
            console.warn('ASCII Tree Menu: Modal not found', modalId);
        }
    }

    cycleTheme() {
        if (window.ThemeManager && window.ThemeManager.cycleTheme) {
            window.ThemeManager.cycleTheme();
            console.log('ASCII Tree Menu: Theme cycled');
        } else {
            console.warn('ASCII Tree Menu: ThemeManager not available');
        }
    }

    // Namespace management methods
    showCurrentNamespaceInfo() {
        // Show current namespace information
        if (window.NamespaceService) {
            const currentId = window.NamespaceService.getNamespaceId();
            const currentMeta = window.NamespaceService.getNamespaceMetadata ? 
                window.NamespaceService.getNamespaceMetadata(currentId) : null;
            
            const info = `Current Namespace: ${currentId}\nMessages: ${currentMeta?.messageCount || 0}`;
            alert(info);
        } else {
            alert('Current Namespace: Default\nNamespace service not available');
        }
    }

    async showNamespaceSwitcher() {
        // Use the existing namespace selection modal for switching
        if (window.NamespaceSelectionModal && window.NamespaceService) {
            try {
                // Get available namespaces
                const namespaceIds = window.NamespaceService.getAllNamespaceIds();
                const namespaces = [];
                
                for (const id of namespaceIds) {
                    const metadata = window.NamespaceService.getNamespaceMetadata(id);
                    if (metadata) {
                        namespaces.push(metadata);
                    }
                }
                
                if (namespaces.length === 0) {
                    alert('No other namespaces available. Create a new namespace first.');
                    return;
                }
                
                // Show selection modal
                const selection = await window.NamespaceSelectionModal.show(namespaces, null);
                
                if (selection.action === 'use_existing') {
                    // Switch to selected namespace
                    const success = window.NamespaceService.setCurrentNamespace(selection.namespace.id);
                    if (success) {
                        alert(`Switched to namespace: ${selection.namespace.title}`);
                        // Reload page to apply namespace switch
                        window.location.reload();
                    } else {
                        alert('Failed to switch namespace');
                    }
                } else if (selection.action === 'create_new') {
                    this.createNewNamespace();
                }
            } catch (error) {
                console.log('Namespace switching cancelled');
            }
        } else {
            console.warn('ASCII Tree Menu: NamespaceSelectionModal or NamespaceService not available');
        }
    }

    createNewNamespace() {
        // Generate a new namespace ID
        const newNamespaceId = this.generateNamespaceId();
        
        if (confirm(`Create new namespace: ${newNamespaceId}?\n\nThis will switch to a new isolated conversation context.`)) {
            try {
                // Create the new namespace directly using NamespaceService
                if (window.NamespaceService && window.CryptoUtils) {
                    // Generate namespace data
                    const namespaceHash = newNamespaceId; // Use ID as hash for simplicity
                    const masterKey = window.CryptoUtils.generateSecretKey();
                    
                    // Store the new namespace data
                    const namespaceStorageKey = `hackare_${newNamespaceId}_namespace`;
                    const masterKeyStorageKey = window.CryptoUtils.getMasterKeyStorageKey(newNamespaceId);
                    
                    // Get encryption key (session key or fallback to namespace hash)
                    const sessionKey = (window.aiHackare && window.aiHackare.shareManager) ? 
                        window.aiHackare.shareManager.getSessionKey() : null;
                    const encryptionKey = sessionKey || namespaceHash;
                    
                    // Encrypt and store namespace hash
                    const encryptedNamespaceData = window.EncryptionService.encrypt(namespaceHash, encryptionKey);
                    localStorage.setItem(namespaceStorageKey, encryptedNamespaceData);
                    
                    // Encrypt and store master key
                    const encryptedMasterKey = window.EncryptionService.encrypt(masterKey, encryptionKey);
                    localStorage.setItem(masterKeyStorageKey, encryptedMasterKey);
                    
                    // Set the namespace directly in the service state instead of using setCurrentNamespace
                    if (window.NamespaceService) {
                        // Force the service to use this new namespace
                        window.NamespaceService.resetNamespaceCache();
                        
                        // Clear existing data except namespace-related keys
                        const keysToKeep = ['hackare_visited', 'debug_mode', 'theme_mode'];
                        const allKeys = Object.keys(localStorage);
                        
                        for (const key of allKeys) {
                            if (!keysToKeep.includes(key) && 
                                !key.includes('_master_key') && 
                                !key.includes('_namespace') &&
                                !key.includes(newNamespaceId)) {
                                localStorage.removeItem(key);
                            }
                        }
                        
                        alert(`New namespace ${newNamespaceId} created successfully. Reloading...`);
                        window.location.reload();
                    } else {
                        alert('Failed to create new namespace - service not available.');
                    }
                } else {
                    alert('Namespace service not available. Cannot create new namespace.');
                }
            } catch (error) {
                console.error('Error creating new namespace:', error);
                alert('Error creating new namespace. Please try again.');
            }
        }
    }
    
    generateNamespaceId() {
        // Generate 8-character hex ID similar to existing namespace system
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }

    deleteCurrentNamespace() {
        if (confirm('Are you sure you want to delete the current namespace? This action cannot be undone.')) {
            if (window.NamespaceService) {
                const currentId = window.NamespaceService.getNamespaceId();
                
                // Clear current namespace data
                const keys = Object.keys(localStorage);
                const namespaceKeys = keys.filter(key => key.includes(`hackare_${currentId}_`));
                
                for (const key of namespaceKeys) {
                    localStorage.removeItem(key);
                }
                
                alert('Current namespace deleted. Reloading...');
                window.location.reload();
            } else {
                alert('Cannot delete namespace: NamespaceService not available');
            }
        }
    }

    // Public method to refresh the menu if needed
    refresh() {
        console.log('ASCII Tree Menu: Refreshing...');
        this.bindEvents();
    }

    // Public method to expand/collapse programmatically
    setExpanded(target, expanded) {
        const toggleElement = this.container.querySelector(`[data-target="${target}"]`);
        if (toggleElement) {
            const currentText = toggleElement.textContent;
            const isCurrentlyExpanded = currentText.includes('[−]') || currentText.includes('[-]');
            
            if (expanded !== isCurrentlyExpanded) {
                this.handleToggle(toggleElement);
            }
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize for heart logo tooltip
    const heartTooltip = document.querySelector('.heart-logo .tooltip');
    if (heartTooltip) {
        window.asciiTreeMenu = new ASCIITreeMenu('.heart-logo .tooltip');
    }
});