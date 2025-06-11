import pytest
import time
import os
from dotenv import load_dotenv
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

# Load environment variables from .env file in the current directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
# Get API key from environment variables
API_KEY = os.getenv("OPENAI_API_KEY")

def test_stop_generation_ui_service_direct(page: Page, serve_hacka_re):
    """Test that the ChatUIService correctly changes button states."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    screenshot_with_markdown(page, "Initial page load")
    
    # Test the UI service directly
    result = page.evaluate("""() => {
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        const chatMessages = document.getElementById('chat-messages');
        
        if (!sendBtn || !messageInput || !chatMessages) {
            return { success: false, error: 'Required elements not found' };
        }
        
        // Check initial state
        const initialIcon = sendBtn.querySelector('i');
        const initialClasses = initialIcon ? initialIcon.className : 'none';
        const initialTitle = sendBtn.getAttribute('title');
        
        // Test ChatUIService if available
        if (!window.ChatUIService) {
            return { success: false, error: 'ChatUIService not found' };
        }
        
        const elements = { sendBtn, messageInput, chatMessages };
        const uiHandler = window.ChatUIService.createUIStateHandler(elements);
        
        // Test setting generating state
        uiHandler.setGeneratingState();
        
        const generatingIcon = sendBtn.querySelector('i');
        const generatingClasses = generatingIcon ? generatingIcon.className : 'none';
        const generatingTitle = sendBtn.getAttribute('title');
        
        // Test resetting state
        uiHandler.resetState();
        
        const resetIcon = sendBtn.querySelector('i');
        const resetClasses = resetIcon ? resetIcon.className : 'none';
        const resetTitle = sendBtn.getAttribute('title');
        
        return {
            success: true,
            initial: { classes: initialClasses, title: initialTitle },
            generating: { classes: generatingClasses, title: generatingTitle },
            reset: { classes: resetClasses, title: resetTitle }
        };
    }""")
    
    # Check the results
    assert result['success'], f"Test failed: {result.get('error', 'Unknown error')}"
    
    # Verify initial state
    assert 'fa-paper-plane' in result['initial']['classes'], f"Initial icon should be paper plane, got: {result['initial']['classes']}"
    assert result['initial']['title'] == 'Send message', f"Initial title should be 'Send message', got: {result['initial']['title']}"
    
    # Verify generating state
    assert 'fa-stop' in result['generating']['classes'], f"Generating icon should be stop, got: {result['generating']['classes']}"
    assert result['generating']['title'] == 'Stop generation', f"Generating title should be 'Stop generation', got: {result['generating']['title']}"
    
    # Verify reset state
    assert 'fa-paper-plane' in result['reset']['classes'], f"Reset icon should be paper plane, got: {result['reset']['classes']}"
    assert result['reset']['title'] == 'Send message', f"Reset title should be 'Send message', got: {result['reset']['title']}"

def test_chat_manager_stop_logic(page: Page, serve_hacka_re):
    """Test that the ChatManager getIsGenerating and stopGeneration methods work."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Test chat manager methods
    result = page.evaluate("""() => {
        // Wait for aiHackare to be initialized
        if (!window.aiHackare || !window.aiHackare.chatManager) {
            return { success: false, error: 'ChatManager not found' };
        }
        
        const chatManager = window.aiHackare.chatManager;
        
        // Check if required methods exist
        if (typeof chatManager.getIsGenerating !== 'function') {
            return { success: false, error: 'getIsGenerating method not found' };
        }
        
        if (typeof chatManager.stopGeneration !== 'function') {
            return { success: false, error: 'stopGeneration method not found' };
        }
        
        // Test initial state
        const initiallyGenerating = chatManager.getIsGenerating();
        
        // Try calling stopGeneration (should be safe even when not generating)
        try {
            chatManager.stopGeneration();
            const afterStopGenerating = chatManager.getIsGenerating();
            
            return {
                success: true,
                initiallyGenerating: initiallyGenerating,
                afterStopGenerating: afterStopGenerating
            };
        } catch (error) {
            return { success: false, error: 'Error calling stopGeneration: ' + error.message };
        }
    }""")
    
    # Check the results
    assert result['success'], f"Test failed: {result.get('error', 'Unknown error')}"
    
    # Should not be generating initially
    assert not result['initiallyGenerating'], f"Should not be generating initially, got: {result['initiallyGenerating']}"
    
    # Should still not be generating after calling stop
    assert not result['afterStopGenerating'], f"Should not be generating after stop, got: {result['afterStopGenerating']}"

def test_send_message_stop_logic(page: Page, serve_hacka_re):
    """Test that the sendMessage function properly handles stop generation."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Test the sendMessage stop logic
    result = page.evaluate("""() => {
        if (!window.aiHackare) {
            return { success: false, error: 'aiHackare not found' };
        }
        
        const aiHackare = window.aiHackare;
        
        // Check if sendMessage method exists
        if (typeof aiHackare.sendMessage !== 'function') {
            return { success: false, error: 'sendMessage method not found' };
        }
        
        // Mock the isGenerating state for testing
        const originalGetIsGenerating = aiHackare.chatManager.getIsGenerating;
        const originalStopGeneration = aiHackare.chatManager.stopGeneration;
        
        let stopGenerationCalled = false;
        
        // Mock generating state
        aiHackare.chatManager.getIsGenerating = () => true;
        aiHackare.chatManager.stopGeneration = () => {
            stopGenerationCalled = true;
        };
        
        // Call sendMessage - it should detect generating state and call stopGeneration
        try {
            aiHackare.sendMessage();
            
            // Restore original methods
            aiHackare.chatManager.getIsGenerating = originalGetIsGenerating;
            aiHackare.chatManager.stopGeneration = originalStopGeneration;
            
            return {
                success: true,
                stopGenerationCalled: stopGenerationCalled
            };
        } catch (error) {
            // Restore original methods
            aiHackare.chatManager.getIsGenerating = originalGetIsGenerating;
            aiHackare.chatManager.stopGeneration = originalStopGeneration;
            
            return { success: false, error: 'Error calling sendMessage: ' + error.message };
        }
    }""")
    
    # Check the results
    assert result['success'], f"Test failed: {result.get('error', 'Unknown error')}"
    
    # stopGeneration should have been called
    assert result['stopGenerationCalled'], "stopGeneration should have been called when isGenerating returns true"