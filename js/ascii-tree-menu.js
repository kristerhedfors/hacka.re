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
                this.handleToggle(e.target);
            }
        });

        // Handle feature link clicks
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('feature-link')) {
                this.handleFeatureLink(e.target);
            }
        });

        // Add touch support for mobile devices
        this.container.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent double-tap zoom
            
            if (e.target.classList.contains('tree-toggle')) {
                this.handleToggle(e.target);
            } else if (e.target.classList.contains('feature-link')) {
                this.handleFeatureLink(e.target);
            } else if (e.target.tagName === 'A' || e.target.closest('a')) {
                // Handle regular links
                const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                if (link.href) {
                    window.open(link.href, link.target || '_self');
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
            'copy-chat': 'copy-chat-btn',
            'mcp-servers': 'mcp-servers-btn',
            'function-calling': 'function-btn',
            'system-prompts': 'prompts-btn',
            'share': 'share-btn',
            'theme': 'theme-toggle-btn',
            'settings': 'settings-btn'
        };

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