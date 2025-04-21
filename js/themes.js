/**
 * Modern Theme for hacka.re
 * Simplified theme implementation with only the modern interface
 */

window.ThemeService = (function() {
    /**
     * Initialize the theme
     */
    function initTheme() {
        // Ensure the modern theme is applied
        document.documentElement.classList.add('theme-modern');
        
        // Remove any other theme classes
        document.documentElement.classList.remove('theme-retro', 'theme-terminal');
        
        // Clear any saved theme preference
        localStorage.removeItem('aihackare_theme');
    }
    
    // Initialize theme when DOM is loaded
    document.addEventListener('DOMContentLoaded', initTheme);
    
    // Public API
    return {
        initTheme: initTheme
    };
})();
