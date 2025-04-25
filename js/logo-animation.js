/**
 * Logo Animation for hacka.re
 * Creates a heartbeat animation through three dots inside the heart logo
 * Animation runs continuously when waiting for a response, serving as a loading indicator
 */

window.LogoAnimation = (function() {
    // Animation state
    let animationRunning = false;
    let animationLoop = null;
    let dots = [];
    let tooltipActive = false;
    
    // Check if browser is Firefox Focus
    function isFirefoxFocus() {
        return navigator.userAgent.includes('Focus') || 
               (navigator.userAgent.includes('Firefox') && navigator.userAgent.includes('Mobile'));
    }
    
    // Initialize the animation
    function init() {
        document.addEventListener('DOMContentLoaded', function() {
            // Add a special class to the body for Firefox Focus
            if (isFirefoxFocus()) {
                document.body.classList.add('firefox-focus');
                
                // Show the SVG fallback for Firefox Focus
                const svgFallback = document.querySelector('.firefox-focus-fallback');
                if (svgFallback) {
                    svgFallback.style.display = 'block';
                }
            }
            
            // Get the heart logo element
            const heartLogo = document.querySelector('.heart-logo');
            const typingDots = document.querySelector('.typing-dots');
            
            if (!heartLogo || !typingDots) return;
            
            // Clear existing dots
            typingDots.innerHTML = '';
            
            // Position the typing dots container inside the heart
            typingDots.style.position = 'absolute';
            typingDots.style.top = '50%';
            typingDots.style.left = '50%';
            typingDots.style.transform = 'translate(-50%, -50%)';
            typingDots.style.width = '16px';
            typingDots.style.height = '6px';
            typingDots.style.display = 'flex';
            typingDots.style.justifyContent = 'space-between';
            typingDots.style.alignItems = 'center';
            typingDots.style.zIndex = '2';
            
            // Create three dots
            dots = [];
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('span');
                dot.className = 'dot';
                
                // Use CSS class instead of inline styles for better compatibility
                // The .dot class is defined in styles.css
                dot.style.opacity = '0'; // Initially invisible
                
                // Set a specific style for Firefox Focus
                if (isFirefoxFocus()) {
                    // Force hardware acceleration and visibility
                    dot.style.transform = 'translateZ(0)';
                    dot.style.willChange = 'opacity, transform';
                    
                    // Explicitly set all styles for Firefox Focus
                    dot.style.backgroundColor = '#22CC22';
                    dot.style.width = '3px';
                    dot.style.height = '3px';
                    dot.style.borderRadius = '50%';
                    dot.style.display = 'inline-block';
                    dot.style.boxShadow = '0 1px 1px rgba(0, 0, 0, 0.2)';
                    dot.style.opacity = '1'; // Always visible in Firefox Focus
                    
                    // Add !important to critical styles for Firefox Focus
                    dot.style.setProperty('background-color', '#22CC22', 'important');
                    dot.style.setProperty('opacity', '1', 'important');
                    dot.style.setProperty('width', '3px', 'important');
                    dot.style.setProperty('height', '3px', 'important');
                }
                
                typingDots.appendChild(dot);
                dots.push(dot);
            }
            
            // Position dots with specific spacing
            typingDots.style.display = 'flex';
            typingDots.style.justifyContent = 'center';
            
            // Set a default spacing of 2px between dots
            typingDots.style.gap = '2px';
            
            // Then adjust the second and third dots to be 1px closer
            dots[1].style.marginLeft = '-1px';
            dots[2].style.marginLeft = '-1px';
            
            // Create the keyframe animations for heartbeat with rapid opacity changes
            // Enhanced for better compatibility with Firefox Focus
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                @keyframes heartbeatLub {
                    0% { transform: translateY(0) translateZ(0); opacity: 0; background-color: #22CC22; }
                    10% { transform: translateY(-1px) translateZ(0); opacity: 1; background-color: #22CC22; }
                    50% { transform: translateY(-4px) translateZ(0); opacity: 1; background-color: #22CC22; }
                    90% { transform: translateY(-1px) translateZ(0); opacity: 1; background-color: #22CC22; }
                    100% { transform: translateY(0) translateZ(0); opacity: 0; background-color: #22CC22; }
                }
                
                @keyframes heartbeatDub {
                    0% { transform: translateY(0) translateZ(0); opacity: 0; background-color: #22CC22; }
                    10% { transform: translateY(-1px) translateZ(0); opacity: 1; background-color: #22CC22; }
                    50% { transform: translateY(-2px) translateZ(0); opacity: 1; background-color: #22CC22; }
                    90% { transform: translateY(-1px) translateZ(0); opacity: 1; background-color: #22CC22; }
                    100% { transform: translateY(0) translateZ(0); opacity: 0; background-color: #22CC22; }
                }
            `;
            document.head.appendChild(styleSheet);
            
            // Run initial animation once
            setTimeout(() => {
                runSingleHeartbeat();
            }, 100);
            
            // Listen for custom events to start/stop the animation
            document.addEventListener('ai-response-start', startAnimation);
            document.addEventListener('ai-response-end', stopAnimation);
            
            // Add tooltip functionality
            const tooltip = heartLogo.querySelector('.tooltip');
            if (tooltip) {
                // Make tooltip stay open when clicked or hovered
                heartLogo.addEventListener('click', function(e) {
                    e.stopPropagation(); // Prevent document click from immediately closing it
                    
                    if (tooltip.classList.contains('active')) {
                        tooltip.classList.remove('active');
                        tooltipActive = false;
                    } else {
                        tooltip.classList.add('active');
                        tooltipActive = true;
                    }
                });
                
                // Make tooltip stay open when hovered
                heartLogo.addEventListener('mouseenter', function() {
                    tooltip.classList.add('active');
                    tooltipActive = true;
                });
                
                // Allow clicking inside the tooltip without closing it
                tooltip.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
                
                // Close tooltip when clicking elsewhere on the document
                document.addEventListener('click', function() {
                    if (tooltipActive) {
                        tooltip.classList.remove('active');
                        tooltipActive = false;
                    }
                });
                
                // Add close button to tooltip
                const closeButton = document.createElement('button');
                closeButton.innerHTML = '&times;';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '5px';
                closeButton.style.right = '5px';
                closeButton.style.background = 'none';
                closeButton.style.border = 'none';
                closeButton.style.fontSize = '1.2rem';
                closeButton.style.cursor = 'pointer';
                closeButton.style.color = 'var(--text-color)';
                closeButton.title = 'Close';
                
                closeButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    tooltip.classList.remove('active');
                    tooltipActive = false;
                });
                
                tooltip.appendChild(closeButton);
            }
        });
    }
    
    // Function to run a single heartbeat (lub-dub)
    function runSingleHeartbeat() {
        return new Promise(resolve => {
            // Reset any existing animations and make dots visible
            dots.forEach(dot => {
                dot.style.animation = 'none';
                dot.style.transform = 'translateY(0) translateZ(0)';
                dot.style.opacity = '1'; // Make dots visible during heartbeat
                
                // Explicitly set styles for Firefox Focus compatibility
                dot.style.backgroundColor = '#22CC22';
                dot.style.width = '3px';
                dot.style.height = '3px';
                dot.style.borderRadius = '50%';
                dot.style.display = 'inline-block';
                dot.style.boxShadow = '0 1px 1px rgba(0, 0, 0, 0.2)';
                
                // Force hardware acceleration
                dot.style.willChange = 'opacity, transform';
            });
            
            // First beat (lub) - stronger
            dots.forEach((dot, index) => {
                setTimeout(() => {
                    // Apply animation with !important to override any browser restrictions
                    dot.style.setProperty('animation', 'heartbeatLub 200ms ease-in-out', 'important');
                    
                    // For Firefox Focus, also set these properties directly
                    if (isFirefoxFocus()) {
                        setTimeout(() => {
                            dot.style.opacity = '1';
                            dot.style.backgroundColor = '#22CC22';
                            dot.style.transform = 'translateY(-4px) translateZ(0)';
                        }, 100); // At 50% of animation
                    }
                }, index * 30);
            });
            
            // Second beat (dub) - softer, after a short delay
            setTimeout(() => {
                dots.forEach((dot, index) => {
                    setTimeout(() => {
                        // Apply animation with !important
                        dot.style.setProperty('animation', 'heartbeatDub 200ms ease-in-out', 'important');
                        
                        // For Firefox Focus, also set these properties directly
                        if (isFirefoxFocus()) {
                            setTimeout(() => {
                                dot.style.opacity = '1';
                                dot.style.backgroundColor = '#22CC22';
                                dot.style.transform = 'translateY(-2px) translateZ(0)';
                            }, 100); // At 50% of animation
                        }
                    }, index * 30);
                });
                
                // Handle dots after the second beat completes
                setTimeout(() => {
                    if (!animationRunning) {
                        dots.forEach(dot => {
                            // In Firefox Focus, keep dots visible even when not animating
                            if (isFirefoxFocus()) {
                                dot.style.opacity = '1';
                                dot.style.backgroundColor = '#22CC22';
                                dot.style.transform = 'translateY(0) translateZ(0)';
                            } else {
                                dot.style.opacity = '0'; // Hide dots after animation in other browsers
                            }
                        });
                    }
                    resolve();
                }, 300);
            }, 300);
        });
    }
    
    // Start the continuous animation
    async function startAnimation() {
        if (animationRunning) return;
        
        animationRunning = true;
        
        // Run the animation in a loop
        async function animationCycle() {
            if (!animationRunning) return;
            
            // Run a single heartbeat
            await runSingleHeartbeat();
            
            // Pause between heartbeats
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Continue the loop if animation is still running
            if (animationRunning) {
                animationLoop = setTimeout(animationCycle, 0);
            }
        }
        
        // Start the animation cycle
        animationCycle();
    }
    
    // Stop the animation
    function stopAnimation() {
        animationRunning = false;
        
        if (animationLoop) {
            clearTimeout(animationLoop);
            animationLoop = null;
        }
        
        // Reset dots to their initial state
        if (dots.length > 0) {
            dots.forEach(dot => {
                dot.style.animation = 'none';
                dot.style.transform = 'translateY(0)';
                
                // In Firefox Focus, keep dots visible even when not animating
                if (isFirefoxFocus()) {
                    dot.style.opacity = '1';
                    dot.style.backgroundColor = '#22CC22';
                } else {
                    dot.style.opacity = '0'; // Hide dots when not animating in other browsers
                }
            });
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
