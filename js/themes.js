/**
 * Theme Switcher for ai.hacka.re
 * Handles theme switching between Modern, Retro Game, and Hacker Terminal themes
 */

class ThemeSwitcher {
    constructor() {
        // Theme options
        this.themes = ['modern', 'retro', 'terminal'];
        
        // Default theme
        this.currentTheme = 'modern';
    }
    
    init() {
        // Load saved theme from localStorage
        this.loadSavedTheme();
    }
    
    /**
     * Load saved theme from localStorage
     */
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('aihackare_theme');
        
        if (savedTheme && this.themes.includes(savedTheme)) {
            this.setTheme(savedTheme);
            
            // Update radio button in settings if it exists
            const themeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
            if (themeRadio) {
                themeRadio.checked = true;
            }
        } else {
            // Default to modern theme if no saved preference
            this.setTheme('modern');
        }
    }
    
    /**
     * Set the active theme
     * @param {string} theme - The theme to set ('modern', 'retro', or 'terminal')
     */
    setTheme(theme) {
        if (!this.themes.includes(theme)) return;
        
        // Remove all theme classes
        document.documentElement.classList.remove('theme-modern', 'theme-retro', 'theme-terminal');
        
        // Add the selected theme class
        document.documentElement.classList.add(`theme-${theme}`);
        
        // Save current theme
        this.currentTheme = theme;
        
        // Save theme preference to localStorage
        localStorage.setItem('aihackare_theme', theme);
        
        // Play theme change sound effect
        this.playThemeChangeSound(theme);
    }
    
    /**
     * Play a sound effect when changing themes
     * @param {string} theme - The selected theme
     */
    playThemeChangeSound(theme) {
        const sound = new Audio();
        
        if (theme === 'modern') {
            sound.src = 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9vAAAAAP////8AAAAA/////wAAAAD/////'; // Simple beep
        } else if (theme === 'retro') {
            sound.src = 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9vAAAAAP8AAAD/////AAAAAP////8='; // Retro game sound
        } else if (theme === 'terminal') {
            sound.src = 'data:audio/wav;base64,UklGRl9vAAADZGF0YT9vAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // Terminal beep
        }
        
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
}

// Initialize theme switcher when AIHackare class is available
document.addEventListener('DOMContentLoaded', function() {
    // Create theme switcher instance
    window.themeSwitcher = new ThemeSwitcher();
    
    // Initialize theme switcher
    window.themeSwitcher.init();
    
    // Add theme switcher to settings modal if AIHackare is initialized
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        // Create theme options section
        const themeSection = document.createElement('div');
        themeSection.className = 'form-group';
        themeSection.innerHTML = `
            <label>Theme</label>
            <div class="theme-options">
                <div class="theme-option">
                    <input type="radio" id="theme-modern" name="theme" value="modern">
                    <label for="theme-modern" class="theme-option-label">
                        <span class="theme-icon"><i class="fas fa-circle"></i></span>
                        Modern
                    </label>
                </div>
                <div class="theme-option">
                    <input type="radio" id="theme-retro" name="theme" value="retro">
                    <label for="theme-retro" class="theme-option-label">
                        <span class="theme-icon"><i class="fas fa-gamepad"></i></span>
                        Retro Game
                    </label>
                </div>
                <div class="theme-option">
                    <input type="radio" id="theme-terminal" name="theme" value="terminal">
                    <label for="theme-terminal" class="theme-option-label">
                        <span class="theme-icon"><i class="fas fa-terminal"></i></span>
                        Hacker Terminal
                    </label>
                </div>
            </div>
        `;
        
        // Insert theme section before the form actions
        const formActions = settingsForm.querySelector('.form-actions');
        if (formActions) {
            settingsForm.insertBefore(themeSection, formActions);
        } else {
            settingsForm.appendChild(themeSection);
        }
        
        // Set the current theme in the radio buttons
        const currentTheme = localStorage.getItem('aihackare_theme') || 'modern';
        const themeRadio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }
        
        // Add event listeners to theme radio buttons
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    window.themeSwitcher.setTheme(this.value);
                }
            });
        });
        
        // Extend the AIHackare.saveSettings method to save theme preference
        const originalSaveSettings = window.aiHackare?.saveSettings;
        if (originalSaveSettings && typeof originalSaveSettings === 'function') {
            window.aiHackare.saveSettings = function() {
                // Call the original method
                originalSaveSettings.call(window.aiHackare);
                
                // Save theme preference
                const selectedTheme = document.querySelector('input[name="theme"]:checked')?.value || 'modern';
                localStorage.setItem('aihackare_theme', selectedTheme);
                window.themeSwitcher.setTheme(selectedTheme);
            };
        }
    }
});
