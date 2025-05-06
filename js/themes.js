/**
 * Modern Theme for hacka.re
 * Theme implementation with light, dark, and sunset modes
 */

window.ThemeService = (function() {
    const THEME_STORAGE_KEY = 'aihackare_theme_mode';
    let darkModeToggleBtn;
    
    // Define the theme cycle order - include light and dark modes
    const themeOrder = ['light', 'dark', 'sunset', 'ocean', 'forest', 'midnight'];
    
    /**
     * Initialize the theme
     */
    function initTheme() {
        console.log('ThemeService: Initializing theme');
        
        // Create theme toggle button
        createThemeToggle();
        
        // Get saved theme preference or use system preference
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        console.log('ThemeService: Saved theme preference:', savedTheme);
        
        // Apply theme based on saved preference or system preference
        if (savedTheme) {
            console.log('ThemeService: Applying saved theme:', savedTheme);
            applyTheme(savedTheme);
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                console.log('ThemeService: System prefers dark mode, applying dark theme');
                enableDarkMode();
            } else {
                console.log('ThemeService: System prefers light mode or no preference, applying light theme');
                enableLightMode();
            }
        }
        
        // Add keyboard shortcuts for cycling themes (Alt+Shift+T)
        document.addEventListener('keydown', function(event) {
            if (event.altKey && event.shiftKey && event.key === 'T') {
                console.log('ThemeService: Theme cycle keyboard shortcut triggered');
                cycleTheme();
            }
        });
        
        // Add event listener for system preference changes
        if (window.matchMedia) {
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
            console.log('ThemeService: System prefers dark mode:', prefersDarkMode.matches);
            
            // Listen for changes to system preference
            prefersDarkMode.addEventListener('change', (e) => {
                // Only apply system preference if no saved preference exists
                if (!localStorage.getItem(THEME_STORAGE_KEY)) {
                    console.log('ThemeService: System preference changed, new preference:', e.matches ? 'dark' : 'light');
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
     * Create and add the dark mode toggle button to the header
     * This function is kept for compatibility but doesn't create a separate button anymore
     */
    function createDarkModeToggle() {
        console.log('ThemeService: Dark mode toggle functionality now integrated into theme cycle button');
        // No longer creating a separate dark mode toggle button
        return;
    }
    
    /**
     * Update the toggle button icon based on current theme
     */
    function updateToggleButton() {
        if (darkModeToggleBtn) {
            darkModeToggleBtn.innerHTML = isDarkMode() 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
            
            darkModeToggleBtn.title = isDarkMode() 
                ? 'Switch to Light Mode' 
                : 'Switch to Dark Mode';
        }
    }
    
    /**
     * Toggle between dark and light mode
     */
    function toggleDarkMode() {
        console.log('ThemeService: Toggling dark mode, current mode:', isDarkMode() ? 'dark' : 'light');
        
        try {
            if (isDarkMode()) {
                console.log('ThemeService: Switching to light mode');
                enableLightMode();
            } else {
                console.log('ThemeService: Switching to dark mode');
                enableDarkMode();
            }
            
            // Force a repaint to ensure the changes take effect
            document.documentElement.style.display = 'none';
            // This will force a reflow
            void document.documentElement.offsetHeight;
            document.documentElement.style.display = '';
            
            console.log('ThemeService: Theme toggled, new mode:', isDarkMode() ? 'dark' : 'light');
        } catch (error) {
            console.error('ThemeService: Error toggling dark mode:', error);
        }
    }
    
    /**
     * Toggle sunset theme
     */
    function toggleSunsetTheme() {
        console.log('ThemeService: Toggling sunset theme, current mode:', getThemeMode());
        
        try {
            if (isSunsetTheme()) {
                console.log('ThemeService: Switching to light mode from sunset');
                enableLightMode();
            } else {
                console.log('ThemeService: Switching to sunset theme');
                enableSunsetTheme();
            }
            
            // Force a repaint to ensure the changes take effect
            document.documentElement.style.display = 'none';
            // This will force a reflow
            void document.documentElement.offsetHeight;
            document.documentElement.style.display = '';
            
            console.log('ThemeService: Theme toggled, new mode:', getThemeMode());
        } catch (error) {
            console.error('ThemeService: Error toggling sunset theme:', error);
        }
    }
    
    /**
     * Enable dark mode
     */
    function enableDarkMode() {
        console.log('ThemeService: Enabling dark mode');
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
        console.log('ThemeService: Enabling light mode');
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-modern');
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        updateThemeDropdown('light');
    }
    
    /**
     * Enable sunset theme
     */
    function enableSunsetTheme() {
        console.log('ThemeService: Enabling sunset theme');
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-sunset');
        localStorage.setItem(THEME_STORAGE_KEY, 'sunset');
        updateThemeDropdown('sunset');
    }
    
    /**
     * Enable ocean theme
     */
    function enableOceanTheme() {
        console.log('ThemeService: Enabling ocean theme');
        try {
            console.log('ThemeService: Current classes:', document.documentElement.classList);
            removeAllThemeClasses();
            console.log('ThemeService: After removing classes:', document.documentElement.classList);
            document.documentElement.classList.add('theme-ocean');
            console.log('ThemeService: After adding ocean theme:', document.documentElement.classList);
            localStorage.setItem(THEME_STORAGE_KEY, 'ocean');
            updateThemeDropdown('ocean');
            console.log('ThemeService: Ocean theme enabled');
        } catch (error) {
            console.error('ThemeService: Error enabling ocean theme:', error);
        }
    }
    
    /**
     * Enable forest theme
     */
    function enableForestTheme() {
        console.log('ThemeService: Enabling forest theme');
        removeAllThemeClasses();
        document.documentElement.classList.add('theme-forest');
        localStorage.setItem(THEME_STORAGE_KEY, 'forest');
        updateThemeDropdown('forest');
    }
    
    /**
     * Enable midnight theme
     */
    function enableMidnightTheme() {
        console.log('ThemeService: Enabling midnight theme');
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
        console.log('ThemeService: Applying theme:', themeName);
        
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
                console.log('ThemeService: Unknown theme name, defaulting to light mode');
                enableLightMode();
                break;
        }
    }

    /**
     * Cycle to the next theme in the theme order
     */
    function cycleTheme() {
        console.log('ThemeService: Cycling to next theme');
        
        try {
            // Get current theme
            const currentTheme = getThemeMode();
            console.log('ThemeService: Current theme before cycling:', currentTheme);
            
            // Find the index of the current theme in the theme order
            let currentIndex = themeOrder.indexOf(currentTheme);
            
            // If current theme is not in the theme order, default to light theme
            if (currentIndex === -1) {
                console.log('ThemeService: Current theme not in cycle order, defaulting to light theme');
                enableLightMode();
                return;
            }
            
            // Calculate the next theme index (cycle back to 0 if at the end)
            const nextIndex = (currentIndex + 1) % themeOrder.length;
            
            // Get the next theme
            const nextTheme = themeOrder[nextIndex];
            console.log('ThemeService: Next theme:', nextTheme);
            
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
            
            console.log('ThemeService: Theme cycled, new mode:', getThemeMode());
        } catch (error) {
            console.error('ThemeService: Error cycling theme:', error);
        }
    }
    
    /**
     * Create theme toggle button
     */
    function createThemeToggle() {
        console.log('ThemeService: Creating theme toggle button');
        
        // Check if toggle already exists
        let themeToggleBtn = document.getElementById('theme-toggle-btn');
        
        if (themeToggleBtn) {
            console.log('ThemeService: Theme toggle button already exists, attaching event listener');
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
                console.log('ThemeService: Theme toggle button added to settings');
            } else {
                header.appendChild(themeToggleBtn);
                console.log('ThemeService: Theme toggle button added to header');
            }
        } else {
            console.error('ThemeService: Header element not found');
        }
    }
    
    /**
     * Update theme dropdown selection (kept for compatibility)
     */
    function updateThemeDropdown(theme) {
        // This function is kept for compatibility but doesn't do anything now
        console.log('ThemeService: Theme updated to:', theme);
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
