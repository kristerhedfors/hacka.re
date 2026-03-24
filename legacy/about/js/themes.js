/**
 * Theme script for hacka.re About Page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Ensure the modern theme is applied
    document.documentElement.classList.add('theme-modern');
    
    // Remove any other theme classes
    document.documentElement.classList.remove('theme-retro', 'theme-terminal');
});
