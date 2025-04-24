/**
 * Main JavaScript for AIHackare
 * A simple chat interface for OpenAI-compatible APIs
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the chat application
    const aiHackare = new AIHackareComponent.AIHackare();
    aiHackare.init();
});
