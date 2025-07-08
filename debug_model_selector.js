// Debug script to test model selector modal
// Run this in browser console to test the modal

console.log('🔍 Debug: Testing model selector modal...');

// Check if elements exist
console.log('🔍 Debug: Checking DOM elements...');
console.log('Model name display:', document.querySelector('.model-name-display'));
console.log('Model context element:', document.querySelector('.model-context'));
console.log('Model stats:', document.querySelector('.model-stats'));
console.log('Model selector modal:', document.querySelector('#model-selector-modal'));

// Check if aiHackare is available
console.log('🔍 Debug: Checking aiHackare...');
console.log('window.aiHackare:', !!window.aiHackare);
if (window.aiHackare) {
    console.log('aiHackare.uiManager:', !!window.aiHackare.uiManager);
    if (window.aiHackare.uiManager) {
        console.log('uiManager.showModelSelectorModal:', typeof window.aiHackare.uiManager.showModelSelectorModal);
    }
}

// Try to manually trigger the modal
function testModal() {
    console.log('🔍 Debug: Attempting to show modal manually...');
    if (window.aiHackare && window.aiHackare.uiManager && window.aiHackare.uiManager.showModelSelectorModal) {
        window.aiHackare.uiManager.showModelSelectorModal();
        console.log('🔍 Debug: Modal show method called');
    } else {
        console.error('🔍 Debug: Modal show method not available');
    }
}

// Test click event on model name
function testClickEvent() {
    console.log('🔍 Debug: Testing click event...');
    const modelNameDisplay = document.querySelector('.model-name-display');
    if (modelNameDisplay) {
        console.log('🔍 Debug: Simulating click on model name display...');
        modelNameDisplay.click();
    } else {
        console.error('🔍 Debug: Model name display element not found');
    }
}

// Test keyboard event
function testKeyboardEvent() {
    console.log('🔍 Debug: Testing keyboard event...');
    const event = new KeyboardEvent('keydown', {
        key: 'm',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(event);
    console.log('🔍 Debug: Keyboard event dispatched');
}

// Export functions to window for manual testing
window.debugModelSelector = {
    testModal,
    testClickEvent,
    testKeyboardEvent
};

console.log('🔍 Debug: Available test functions:');
console.log('  - debugModelSelector.testModal()');
console.log('  - debugModelSelector.testClickEvent()');
console.log('  - debugModelSelector.testKeyboardEvent()');