/**
 * Logo Animation for hacka.re
 * Creates an enhanced gradient wave animation on the heart logo
 * Animation runs continuously when waiting for a response, serving as a loading indicator
 */

window.LogoAnimation = (function() {
    // Animation state
    let animationRunning = false;
    let animationLoop = null;
    let heartLogo = null;
    let originalAnimation = null;
    let tooltipActive = false;
    
    // Check if browser is Firefox Focus
    function isFirefoxFocus() {
        return navigator.userAgent.includes('Focus') || 
               (navigator.userAgent.includes('Firefox') && navigator.userAgent.includes('Mobile'));
    }
    
    // Initialize the animation
    function init() {
        // Support re-initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupAnimation);
        } else {
            setupAnimation();
        }
        
        function setupAnimation() {
            // Add a special class to the body for Firefox Focus
            if (isFirefoxFocus()) {
                document.body.classList.add('firefox-focus');
                
                // Show the SVG fallback for Firefox Focus
                const svgFallback = document.querySelector('.firefox-focus-fallback');
                if (svgFallback) {
                    svgFallback.style.display = 'block';
                }
            }
            
            // Get the heart logo element - support multiple hearts
            const heartLogos = document.querySelectorAll('.heart-logo');
            if (heartLogos.length === 0) {
                return;
            }
            
            // Use the last heart logo (most recently added)
            heartLogo = heartLogos[heartLogos.length - 1];
            const typingDots = heartLogo.querySelector('.typing-dots');
            
            if (!heartLogo) return;
            
            // Hide the typing dots container - we won't use dots anymore
            if (typingDots) {
                typingDots.style.display = 'none';
            }
            
            // Store the original animation settings
            const computedStyle = window.getComputedStyle(heartLogo);
            originalAnimation = computedStyle.animation || computedStyle.webkitAnimation || '';
            
            // Create enhanced pulsing animation that speeds up existing gradient
            const styleSheet = document.createElement('style');
            styleSheet.id = 'heart-animation-styles';
            styleSheet.textContent = `
                /* Realistic heartbeat at ~64 BPM (0.92s per beat) - strong LUB, very weak DUB */
                @keyframes heartbeatLubDub {
                    0% { 
                        filter: brightness(0.7) contrast(1.5);
                    }
                    12.5% { 
                        filter: brightness(1.8) contrast(2.2); /* Very strong LUB peak */
                    }
                    25% { 
                        filter: brightness(0.7) contrast(1.5);
                    }
                    37.5% { 
                        filter: brightness(0.9) contrast(1.5); /* Very weak DUB - subtle */
                    }
                    50% { 
                        filter: brightness(0.7) contrast(1.5);
                    }
                    100% { 
                        filter: brightness(0.7) contrast(1.5); /* Rest period until next beat */
                    }
                }
                
                /* Apply both animations - speed up existing sweep and add heartbeat at ~64 BPM */
                .heart-logo.animating {
                    animation: heartSweep 1s infinite alternate, heartbeatLubDub 0.92s infinite !important;
                }
                
                /* For themes without heartSweep, just use heartbeat */
                html:not(.theme-modern):not(.theme-sunset):not(.theme-ocean):not(.theme-forest):not(.theme-midnight) .heart-logo.animating {
                    color: #e74c3c;
                    animation: heartbeatLubDub 0.92s infinite !important;
                }
            `;
            document.head.appendChild(styleSheet);
            
            // Run initial animation pulse
            setTimeout(() => {
                runSinglePulse();
            }, 100);
            
            // Listen for custom events to start/stop the animation
            document.addEventListener('ai-response-start', startAnimation);
            document.addEventListener('ai-response-end', stopAnimation);
            
            // Add tooltip functionality
            const tooltip = heartLogo.querySelector('.tooltip');
            if (tooltip) {
                // Get related elements that should trigger the tooltip
                const logoText = document.querySelector('.logo-text');
                const tagline = document.querySelector('.tagline');
                const serverlessGPTs = document.querySelector('.serverless-gpts');
                const heartButton = document.getElementById('heart-btn');
                
                // Function to toggle tooltip
                function toggleTooltip(e) {
                    e.stopPropagation(); // Prevent document click from immediately closing it
                    e.preventDefault(); // Prevent any default button behavior
                    
                    if (tooltip.classList.contains('active')) {
                        tooltip.classList.remove('active');
                        tooltipActive = false;
                        // Remove body class for mobile modal behavior
                        document.body.classList.remove('heart-modal-open');
                    } else {
                        tooltip.classList.add('active');
                        tooltipActive = true;
                        // Add body class for mobile modal behavior
                        if (window.MobileUtils && window.MobileUtils.isMobileDevice()) {
                            document.body.classList.add('heart-modal-open');
                        }
                    }
                }
                
                // Prevent clicks inside tooltip from closing it
                tooltip.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
                
                // Add click event listeners to all related elements
                heartLogo.addEventListener('click', toggleTooltip);
                
                // Also add to the parent button if it exists
                if (heartButton) {
                    heartButton.addEventListener('click', toggleTooltip);
                }
                
                // Add touch support for mobile devices
                heartLogo.addEventListener('touchend', function(e) {
                    e.preventDefault(); // Prevent double-tap zoom
                    toggleTooltip(e);
                });
                
                if (heartButton) {
                    heartButton.addEventListener('touchend', function(e) {
                        e.preventDefault(); // Prevent double-tap zoom
                        toggleTooltip(e);
                    });
                }
                
                // Add click event listeners to title, subtitle, and serverless agency text if they exist
                if (logoText) {
                    logoText.addEventListener('click', toggleTooltip);
                }
                
                if (tagline) {
                    tagline.addEventListener('click', toggleTooltip);
                }
                
                if (serverlessGPTs) {
                    serverlessGPTs.addEventListener('click', toggleTooltip);
                }
                
                // Allow clicking inside the tooltip without closing it
                tooltip.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
                
                // Close tooltip when clicking elsewhere on the document
                document.addEventListener('click', function() {
                    if (tooltipActive) {
                        tooltip.classList.remove('active');
                        tooltipActive = false;
                        // Remove body class for mobile modal behavior
                        document.body.classList.remove('heart-modal-open');
                    }
                });
                
                // Note: Close button functionality is now handled by the info icon
                // The info icon serves as both an info button and close functionality
                
                // Add heart modal info icon click handler
                const heartInfoIcon = tooltip.querySelector('#heart-modal-info-icon');
                if (heartInfoIcon) {
                    heartInfoIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (window.SettingsInfoModalService) {
                            window.SettingsInfoModalService.showHeartInfoModal(heartInfoIcon);
                        }
                    });
                }
                
                // Add close functionality when clicking anywhere else in the tooltip
                tooltip.addEventListener('click', function(e) {
                    // Check if click is on the info icon - if so, don't close
                    if (e.target.closest('#heart-modal-info-icon')) {
                        return;
                    }
                    // Allow clicks on interactive elements to work normally
                    if (e.target.classList.contains('tree-toggle') || 
                        e.target.classList.contains('feature-link') || 
                        e.target.classList.contains('tree-link') ||
                        e.target.tagName === 'A') {
                        return;
                    }
                    // Close modal on other clicks
                    tooltip.classList.remove('active');
                    tooltipActive = false;
                    document.body.classList.remove('heart-modal-open');
                });
            }
        }
    }
    
    // Function to run a single pulse of the enhanced gradient animation
    function runSinglePulse() {
        return new Promise(resolve => {
            if (!heartLogo) return resolve();
            
            // Apply the enhanced animation class
            heartLogo.classList.add('animating');
            
            // Run for a short duration then stop if not in continuous mode
            setTimeout(() => {
                if (!animationRunning) {
                    heartLogo.classList.remove('animating');
                }
                resolve();
            }, 1000); // Single pulse duration
        });
    }
    
    // Start the continuous animation
    function startAnimation() {
        if (animationRunning || !heartLogo) return;
        
        animationRunning = true;
        document.body.dataset.animationRunning = 'true';
        
        // Apply the enhanced animation class for continuous animation
        heartLogo.classList.add('animating');
    }
    
    // Stop the animation
    function stopAnimation() {
        animationRunning = false;
        document.body.dataset.animationRunning = 'false';
        
        if (animationLoop) {
            clearTimeout(animationLoop);
            animationLoop = null;
        }
        
        // Remove the animation class to return to normal state
        if (heartLogo) {
            heartLogo.classList.remove('animating');
        }
    }
    
    // Public API
    return {
        init: init,
        start: startAnimation,
        stop: stopAnimation
    };
})();

// Initialize the logo animation
LogoAnimation.init();

// Tree menu functionality is now handled by ascii-tree-menu.js library
