/**
 * Title Subtitle Manager Module
 * Handles title and subtitle-related functionality for the AIHackare application
 */

window.TitleSubtitleManager = (function() {
    /**
     * Create a Title Subtitle Manager instance
     * @returns {Object} Title Subtitle Manager instance
     */
    function createTitleSubtitleManager() {
        /**
         * Update the title and subtitle on all index pages
         * @param {boolean} forceUpdate - Force update even if there's a shared link
         */
        function updateTitleAndSubtitle(forceUpdate = false) {
            // If there's a shared link in the URL and we're not forcing an update,
            // don't update the title and subtitle until the shared data is decrypted
            if (!forceUpdate && LinkSharingService.hasSharedApiKey()) {
                return;
            }
            
            const title = StorageService.getTitle();
            const subtitle = StorageService.getSubtitle();
            
            // Check if using default values
            const isDefaultTitle = title === "hacka.re";
            const isDefaultSubtitle = subtitle === "Free, open, för hackare av hackare";
            
            // Update main page
            const logoTextElements = document.querySelectorAll('.logo-text');
            const taglineElements = document.querySelectorAll('.tagline');
            
            logoTextElements.forEach(element => {
                // Add or remove default-title class based on content
                if (isDefaultTitle) {
                    element.classList.add('default-title');
                } else {
                    element.classList.remove('default-title');
                }
                
                // Preserve the heart logo and typing dots
                const heartLogo = element.querySelector('.heart-logo');
                if (heartLogo) {
                    element.innerHTML = title + '<span class="heart-logo">' + heartLogo.innerHTML + '</span>';
                } else {
                    element.textContent = title;
                }
            });
            
            taglineElements.forEach(element => {
                // Add or remove default-subtitle class based on content
                if (isDefaultSubtitle) {
                    element.classList.add('default-subtitle');
                } else {
                    element.classList.remove('default-subtitle');
                }
                
                element.textContent = subtitle;
            });
            
            // Update document title
            document.title = title + ' - ' + subtitle;
        }
        
        /**
         * Get the current title
         * @returns {string} Current title
         */
        function getTitle() {
            return StorageService.getTitle();
        }
        
        /**
         * Save the title
         * @param {string} title - The title to save
         */
        function saveTitle(title) {
            StorageService.saveTitle(title);
            // Update the UI
            updateTitleAndSubtitle(true);
        }
        
        /**
         * Get the current subtitle
         * @returns {string} Current subtitle
         */
        function getSubtitle() {
            return StorageService.getSubtitle();
        }
        
        /**
         * Save the subtitle
         * @param {string} subtitle - The subtitle to save
         */
        function saveSubtitle(subtitle) {
            StorageService.saveSubtitle(subtitle);
            // Update the UI
            updateTitleAndSubtitle(true);
        }
        
        // Public API
        return {
            updateTitleAndSubtitle,
            getTitle,
            saveTitle,
            getSubtitle,
            saveSubtitle
        };
    }

    // Public API
    return {
        createTitleSubtitleManager
    };
})();
