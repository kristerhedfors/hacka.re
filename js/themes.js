/**
 * Modern Theme for hacka.re
 * Simplified theme implementation with only the modern interface
 */

document.addEventListener('DOMContentLoaded', function() {
    // Ensure the modern theme is applied
    document.documentElement.classList.add('theme-modern');
    
    // Remove any other theme classes
    document.documentElement.classList.remove('theme-retro', 'theme-terminal');
    
    // Clear any saved theme preference
    localStorage.removeItem('aihackare_theme');
});
