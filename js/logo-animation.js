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
    
    // Initialize the animation
    function init() {
        document.addEventListener('DOMContentLoaded', function() {
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
                
                // Set dot appearance
                dot.style.position = 'relative';
                dot.style.width = '3px';
                dot.style.height = '3px';
                dot.style.backgroundColor = '#22CC22'; // Slightly darker terminal green color
                dot.style.borderRadius = '50%';
                dot.style.display = 'inline-block';
                dot.style.boxShadow = '0 1px 1px rgba(0, 0, 0, 0.2)';
                dot.style.opacity = '0'; // Initially invisible
                
                // No margin initially
                dot.style.margin = '0';
                
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
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                @keyframes heartbeatLub {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { transform: translateY(-1px); opacity: 1; }
                    50% { transform: translateY(-4px); opacity: 1; }
                    90% { transform: translateY(-1px); opacity: 1; }
                    100% { transform: translateY(0); opacity: 0; }
                }
                
                @keyframes heartbeatDub {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { transform: translateY(-1px); opacity: 1; }
                    50% { transform: translateY(-2px); opacity: 1; }
                    90% { transform: translateY(-1px); opacity: 1; }
                    100% { transform: translateY(0); opacity: 0; }
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
                dot.style.transform = 'translateY(0)';
                dot.style.opacity = '1'; // Make dots visible during heartbeat
            });
            
            // First beat (lub) - stronger
            dots.forEach((dot, index) => {
                setTimeout(() => {
                    dot.style.animation = 'heartbeatLub 200ms ease-in-out';
                }, index * 30);
            });
            
            // Second beat (dub) - softer, after a short delay
            setTimeout(() => {
                dots.forEach((dot, index) => {
                    setTimeout(() => {
                        dot.style.animation = 'heartbeatDub 200ms ease-in-out';
                    }, index * 30);
                });
                
                // Hide dots after the second beat completes (unless animation is running)
                setTimeout(() => {
                    if (!animationRunning) {
                        dots.forEach(dot => {
                            dot.style.opacity = '0'; // Hide dots after animation
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
        
        // Reset dots to their initial state (invisible)
        if (dots.length > 0) {
            dots.forEach(dot => {
                dot.style.animation = 'none';
                dot.style.transform = 'translateY(0)';
                dot.style.opacity = '0'; // Hide dots when not animating
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
