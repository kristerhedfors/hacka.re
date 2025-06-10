/**
 * Modern Theme for hacka.re
 * Theme implementation with light, dark, and sunset modes
 */

window.ThemeService = (function() {
    const THEME_STORAGE_KEY = 'hackare_theme_mode';
    
    // Define the theme cycle order - include light and dark modes
    const themeOrder = ['light', 'dark', 'sunset', 'ocean', 'forest', 'midnight'];
    
    /**
     * Initialize the theme
     */
    function initTheme() {
        
        // Create theme toggle button
        createThemeToggle();
        
        // Get saved theme preference or use system preference
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        
        // Apply theme based on saved preference or default to light mode
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            // Default to light mode regardless of system preference
            enableLightMode();
        }
        
        // Add keyboard shortcuts for cycling themes (Alt+Shift+T)
        document.addEventListener('keydown', function(event) {
            if (event.altKey && event.shiftKey && event.key === 'T') {
                cycleTheme();
            }
        });
        
        // Add event listener for system preference changes
        if (window.matchMedia) {
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Listen for changes to system preference
            prefersDarkMode.addEventListener('change', (e) => {
                // Only apply system preference if no saved preference exists
                if (!localStorage.getItem(THEME_STORAGE_KEY)) {
                    if (e.matches) {
                        enableDarkMode();
                    } else {
                        enableLightMode();
                    }
                }
            });
        }
    }
    
    
    /**
     * Toggle between dark and light mode
     */
    function toggleDarkMode() {
        
        try {
            if (isDarkMode()) {
                enableLightMode();
            } else {
                enableDarkMode();
            }
            
            // Force a repaint to ensure the changes take effect
            document.documentElement.style.display = 'none';
            // This will force a reflow
            void document.documentElement.offsetHeight;
            document.documentElement.style.display = '';
            
        } catch (error) {
        }
    }
    
    /**
     * Toggle sunset theme
     */
    function toggleSunsetTheme() {
        
        try {
            if (isSunsetTheme()) {
                enableLightMode();
            } else {
                enableSunsetTheme();
            }
            
            // Force a repaint to ensure the changes take effect
            document.documentElement.style.display = 'none';
            // This will force a reflow
            void document.documentElement.offsetHeight;
            document.documentElement.style.display = '';
            
        } catch (error) {
        }
    }
    
    /**
     * Enable dark mode
     */
    function enableDarkMode() {
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-modern');
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        updateThemeDropdown('dark');
    }
    
    /**
     * Enable light mode
     */
    function enableLightMode() {
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-modern');
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        updateThemeDropdown('light');
    }
    
    /**
     * Enable sunset theme
     */
    function enableSunsetTheme() {
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-sunset');
        localStorage.setItem(THEME_STORAGE_KEY, 'sunset');
        updateThemeDropdown('sunset');
    }
    
    /**
     * Enable ocean theme
     */
    function enableOceanTheme() {
        try {
            removeAllThemeClasses();
            document.documentElement.classList.add('theme-ocean');
            localStorage.setItem(THEME_STORAGE_KEY, 'ocean');
            updateThemeDropdown('ocean');
        } catch (error) {
        }
    }
    
    /**
     * Enable forest theme
     */
    function enableForestTheme() {
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-forest');
        localStorage.setItem(THEME_STORAGE_KEY, 'forest');
        updateThemeDropdown('forest');
    }
    
    /**
     * Enable midnight theme
     */
    function enableMidnightTheme() {
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-midnight');
        // Still save to localStorage for compatibility with other functions
        // but this won't matter since we always use midnight on reload
        localStorage.setItem(THEME_STORAGE_KEY, 'midnight');
        updateThemeDropdown('midnight');
    }
    
    /**
     * Remove all theme classes
     */
    function removeAllThemeClasses() {
        document.documentElement.classList.remove('theme-modern', 'theme-sunset', 'theme-ocean', 'theme-forest', 'theme-midnight', 'dark-mode');
    }
    
    /**
     * Check if dark mode is currently enabled
     */
    function isDarkMode() {
        return document.documentElement.classList.contains('dark-mode');
    }
    
    /**
     * Check if sunset theme is currently enabled
     */
    function isSunsetTheme() {
        return document.documentElement.classList.contains('theme-sunset');
    }
    
    /**
     * Get the current theme mode
     */
    function getThemeMode() {
        if (document.documentElement.classList.contains('theme-sunset')) {
            return 'sunset';
        } else if (document.documentElement.classList.contains('theme-ocean')) {
            return 'ocean';
        } else if (document.documentElement.classList.contains('theme-forest')) {
            return 'forest';
        } else if (document.documentElement.classList.contains('theme-midnight')) {
            return 'midnight';
        } else if (isDarkMode()) {
            return 'dark';
        } else {
            return 'light';
        }
    }
    
    /**
     * Apply a theme by name
     */
    function applyTheme(themeName) {
        
        switch (themeName) {
            case 'light':
                enableLightMode();
                break;
            case 'dark':
                enableDarkMode();
                break;
            case 'sunset':
                enableSunsetTheme();
                break;
            case 'ocean':
                enableOceanTheme();
                break;
            case 'forest':
                enableForestTheme();
                break;
            case 'midnight':
                enableMidnightTheme();
                break;
            default:
                // Fallback to light mode if theme name is unknown
                enableLightMode();
                break;
        }
    }

    /**
     * Cycle to the next theme in the theme order
     */
    function cycleTheme() {
        
        try {
            // Get current theme
            const currentTheme = getThemeMode();
            
            // Find the index of the current theme in the theme order
            let currentIndex = themeOrder.indexOf(currentTheme);
            
            // If current theme is not in the theme order, default to light theme
            if (currentIndex === -1) {
                enableLightMode();
                return;
            }
            
            // Calculate the next theme index (cycle back to 0 if at the end)
            const nextIndex = (currentIndex + 1) % themeOrder.length;
            
            // Get the next theme
            const nextTheme = themeOrder[nextIndex];
            
            // Apply the next theme
            applyTheme(nextTheme);
            
            // Update loading overlay background if it exists
            if (['sunset', 'ocean', 'forest', 'midnight'].includes(nextTheme)) {
                updateLoadingOverlayBackground(nextTheme);
            }
            
            // Force a repaint to ensure the changes take effect
            document.documentElement.style.display = 'none';
            void document.documentElement.offsetHeight;
            document.documentElement.style.display = '';
            
        } catch (error) {
        }
    }
    
    /**
     * Create theme toggle button
     */
    function createThemeToggle() {
        
        // Check if toggle already exists
        let themeToggleBtn = document.getElementById('theme-toggle-btn');
        
        if (themeToggleBtn) {
            // Add click event listener to cycle through themes
            themeToggleBtn.addEventListener('click', cycleTheme);
            return;
        }
        
        // Create the theme toggle button if it doesn't exist
        themeToggleBtn = document.createElement('button');
        themeToggleBtn.id = 'theme-toggle-btn';
        themeToggleBtn.className = 'icon-btn';
        themeToggleBtn.innerHTML = '<i class="fas fa-paint-brush"></i>';
        themeToggleBtn.title = "Cycle Theme";
        
        // Add click event listener to cycle through themes
        themeToggleBtn.addEventListener('click', cycleTheme);
        
        // Add the button to the settings div in the header
        const header = document.querySelector('header');
        if (header) {
            const settings = header.querySelector('.settings');
            if (settings) {
                settings.appendChild(themeToggleBtn);
            } else {
                header.appendChild(themeToggleBtn);
            }
        } else {
        }
    }
    
    /**
     * Update theme dropdown selection (kept for compatibility)
     */
    function updateThemeDropdown(theme) {
        // This function is kept for compatibility but doesn't do anything now
    }
    
    /**
     * Update the loading overlay background to match the current theme
     * @param {string} theme - The theme to apply
     */
    function updateLoadingOverlayBackground(theme) {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (!loadingOverlay) return;
        
        switch (theme) {
            case 'sunset':
                loadingOverlay.style.background = 'linear-gradient(to bottom, #c0392b, #8e44ad)';
                break;
            case 'ocean':
                loadingOverlay.style.background = 'linear-gradient(to bottom, #1a237e, #00796b)';
                break;
            case 'forest':
                loadingOverlay.style.background = 'linear-gradient(to bottom, #33691e, #004d40)';
                break;
            case 'midnight':
                loadingOverlay.style.background = 'linear-gradient(to bottom, #0d47a1, #4a148c)';
                break;
            default:
                // Default to midnight theme
                loadingOverlay.style.background = 'linear-gradient(to bottom, #0d47a1, #4a148c)';
                break;
        }
    }
    
    // Initialize theme when DOM is loaded
    document.addEventListener('DOMContentLoaded', initTheme);
    
    // Public API
    return {
        initTheme: initTheme,
        toggleDarkMode: toggleDarkMode,
        toggleSunsetTheme: toggleSunsetTheme,
        cycleTheme: cycleTheme,
        enableLightMode: enableLightMode,
        enableDarkMode: enableDarkMode,
        enableSunsetTheme: enableSunsetTheme,
        enableOceanTheme: enableOceanTheme,
        enableForestTheme: enableForestTheme,
        enableMidnightTheme: enableMidnightTheme,
        isDarkMode: isDarkMode,
        isSunsetTheme: isSunsetTheme,
        getThemeMode: getThemeMode
    };
})();
