/**
 * Logo Animation for hacka.re
 * Creates a heartbeat animation through three dots inside the heart logo
 * Animation runs exactly twice (two heartbeats) and then stops
 */

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
    const dots = [];
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        
        // Set dot appearance
        dot.style.position = 'relative';
        dot.style.width = '3px';
        dot.style.height = '3px';
        dot.style.backgroundColor = 'rgba(200, 200, 200, 0.95)';
        dot.style.borderRadius = '50%';
        dot.style.display = 'inline-block';
        dot.style.boxShadow = '0 1px 1px rgba(0, 0, 0, 0.2)';
        
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
    
    // We already have the dots array, no need to query them again
    // const dots = document.querySelectorAll('.typing-dots .dot');
    
    // Create the keyframe animations for heartbeat
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes heartbeatLub {
            0% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(-4px); opacity: 0.8; }
            100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes heartbeatDub {
            0% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(-2px); opacity: 0.9; }
            100% { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Function to run a single heartbeat (lub-dub)
    function runSingleHeartbeat() {
        return new Promise(resolve => {
            // Reset any existing animations
            dots.forEach(dot => {
                dot.style.animation = 'none';
                dot.style.transform = 'translateY(0)';
                dot.style.opacity = '1';
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
                
                // Resolve after the second beat completes
                setTimeout(resolve, 300);
            }, 300);
        });
    }
    
    // Function to run the complete animation sequence
    async function runHeartbeatAnimation() {
        // First heartbeat
        await runSingleHeartbeat();
        
        // Pause between heartbeats
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Second heartbeat (identical to first)
        await runSingleHeartbeat();
    }
    
    // Start the animation after a short delay
    setTimeout(runHeartbeatAnimation, 100);
});
