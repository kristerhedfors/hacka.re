/**
 * Main JavaScript for AIHackare
 * A simple chat interface for GroqCloud's OpenAI API
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the chat application
    const aiHackare = new AIHackareComponent.AIHackare();
    aiHackare.init();
});
