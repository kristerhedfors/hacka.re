/**
 * Logo Animation for hacka.re
 * Creates a wave animation through three dots inside the heart logo
 * Animation runs exactly twice on page load
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get the heart logo element
    const heartLogo = document.querySelector('.heart-logo');
    const typingDots = document.querySelector('.typing-dots');
    
    if (!heartLogo || !typingDots) return;
    
    // Clear existing dots
    typingDots.innerHTML = '';
    
    // Position the heart to ensure proper stacking
    heartLogo.style.position = 'absolute';
    heartLogo.style.display = 'inline-block';
    heartLogo.style.zIndex = '1';
    
    // Position the typing dots container inside the heart
    typingDots.style.position = 'absolute';
    typingDots.style.top = '50%'; // Position vertically centered in the heart
    typingDots.style.left = '50%';
    typingDots.style.transform = 'translate(-50%, -50%)';
    typingDots.style.width = '16px'; // Doubled width to accommodate larger dots
    typingDots.style.height = '6px'; // Doubled height to accommodate larger dots
    typingDots.style.display = 'flex';
    typingDots.style.justifyContent = 'space-between';
    typingDots.style.alignItems = 'center';
    typingDots.style.zIndex = '2';
    
    // Create three dots
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
        dot.style.margin = '0 1px'; // Small margin between dots
        
        typingDots.appendChild(dot);
    }
    
    // Get all dots
    const dots = document.querySelectorAll('.typing-dots .dot');
    
    // Create the keyframe animation for heartbeat effect
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes heartDotWave {
            0%, 100% { transform: translateY(0); opacity: 1; }
            12.5% { transform: translateY(-4px); opacity: 0.8; }
            25% { transform: translateY(0); opacity: 1; }
            37.5% { transform: translateY(4px); opacity: 0.8; }
            50% { transform: translateY(0); opacity: 1; }
            62.5% { transform: translateY(-4px); opacity: 0.8; }
            75% { transform: translateY(0); opacity: 1; }
            87.5% { transform: translateY(4px); opacity: 0.8; }
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Start the animation after a short delay
    setTimeout(() => {
        dots.forEach((dot, index) => {
            // Set animation with delay based on position
            // 75 BPM = 0.8 seconds per beat, two beats = 1.6 seconds
            dot.style.animation = 'heartDotWave 1.6s 1 ease-in-out';
            dot.style.animationDelay = `${index * 0.2}s`;
            dot.style.animationFillMode = 'forwards';
        });
    }, 100);
});
