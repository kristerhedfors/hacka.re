/**
 * Logo typewriter effect - rapidly types out the logo text
 */
(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        const logoContainer = document.querySelector('.logo-text-container');
        if (!logoContainer) return;

        // Get all logo lines
        const logoLines = logoContainer.querySelectorAll('.logo-line');
        if (logoLines.length === 0) return;

        // Store original HTML content for each line
        const originalContent = [];
        const invisibleSpans = [];
        
        logoLines.forEach((line, index) => {
            // Store the original HTML
            originalContent[index] = line.innerHTML;
            
            // Create invisible placeholder to reserve space
            if (index === 0) {
                // For the first line, handle the heart logo specially
                const heartLogo = line.querySelector('.heart-logo');
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalContent[index];
                const textNode = tempDiv.lastChild;
                const textContent = textNode && textNode.nodeType === Node.TEXT_NODE ? textNode.textContent.trim() : '';
                
                // Create invisible span for the text
                const invisibleSpan = document.createElement('span');
                invisibleSpan.style.visibility = 'hidden';
                invisibleSpan.textContent = textContent;
                invisibleSpans[index] = invisibleSpan;
                
                // Clear and rebuild with heart logo and invisible text
                line.innerHTML = '';
                if (heartLogo) {
                    line.appendChild(heartLogo.cloneNode(true));
                }
                line.appendChild(invisibleSpan);
            } else {
                // For other lines, make the entire text invisible
                const textContent = line.textContent;
                const invisibleSpan = document.createElement('span');
                invisibleSpan.style.visibility = 'hidden';
                invisibleSpan.textContent = textContent;
                invisibleSpans[index] = invisibleSpan;
                
                line.innerHTML = '';
                line.appendChild(invisibleSpan);
            }
        });

        // Animation settings
        const totalDuration = 6000; // 6 seconds total (3x slower)
        const totalChars = originalContent.join('').replace(/<[^>]*>/g, '').length;
        const baseCharDelay = totalDuration / totalChars;

        // Type out each line
        let currentDelay = 0;
        
        logoLines.forEach((line, lineIndex) => {
            const content = originalContent[lineIndex];
            
            // Extract text content (without HTML tags)
            let textToType = '';
            
            if (lineIndex === 0) {
                // For the first line, we need to handle the heart logo specially
                // Extract just the text after the heart logo
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                const heartLogo = tempDiv.querySelector('.heart-logo');
                const textNode = tempDiv.lastChild;
                if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                    textToType = textNode.textContent.trim();
                }
            } else {
                // For other lines, just get the text content
                textToType = content.replace(/<[^>]*>/g, '');
            }
            
            // Create a visible span that will be typed out
            const visibleSpan = document.createElement('span');
            if (lineIndex === 0) {
                // Insert visible span before the invisible one (after heart logo)
                line.insertBefore(visibleSpan, invisibleSpans[lineIndex]);
            } else {
                // Insert visible span at the beginning
                line.insertBefore(visibleSpan, line.firstChild);
            }
            
            // Type out each character
            for (let i = 0; i < textToType.length; i++) {
                setTimeout(() => {
                    visibleSpan.textContent += textToType[i];
                    // Progressively hide the invisible span content
                    invisibleSpans[lineIndex].textContent = textToType.substring(i + 1);
                }, currentDelay);
                
                // Add random variation to make it feel more natural (50% to 150% of base delay)
                const randomMultiplier = 0.5 + Math.random(); // 0.5 to 1.5
                currentDelay += baseCharDelay * randomMultiplier;
            }
        });
        
        // Ensure all content is fully displayed after animation completes
        setTimeout(() => {
            logoLines.forEach((line, index) => {
                line.innerHTML = originalContent[index];
            });
        }, totalDuration + 500); // Buffer to ensure completion with random delays
    });
})();