// Debug script to run in browser console with share modal open
// Copy and paste this entire script into the browser console

console.log('=== MCP Checkbox Debug in Modal Context ===');

// 1. Check if elements exist
const modal = document.getElementById('share-modal');
const mcpCheckbox = document.getElementById('share-mcp-connections');
const mcpLabel = document.querySelector('label[for="share-mcp-connections"]');

console.log('Share modal found:', !!modal);
console.log('MCP checkbox found:', !!mcpCheckbox);
console.log('MCP label found:', !!mcpLabel);

if (!mcpCheckbox) {
    console.error('MCP checkbox not found - stopping debug');
    return;
}

// 2. Check element properties
console.log('MCP checkbox properties:');
console.log('- checked:', mcpCheckbox.checked);
console.log('- disabled:', mcpCheckbox.disabled);
console.log('- style.display:', mcpCheckbox.style.display);
console.log('- style.visibility:', mcpCheckbox.style.visibility);
console.log('- style.pointerEvents:', mcpCheckbox.style.pointerEvents);

// 3. Check computed styles
const computedStyle = window.getComputedStyle(mcpCheckbox);
console.log('MCP checkbox computed styles:');
console.log('- display:', computedStyle.display);
console.log('- visibility:', computedStyle.visibility);
console.log('- pointerEvents:', computedStyle.pointerEvents);
console.log('- zIndex:', computedStyle.zIndex);
console.log('- position:', computedStyle.position);

// 4. Check for overlapping elements
const rect = mcpCheckbox.getBoundingClientRect();
const elementAtPoint = document.elementFromPoint(
    rect.left + rect.width/2, 
    rect.top + rect.height/2
);
console.log('Element at checkbox center point:', elementAtPoint);
console.log('Is it the checkbox itself?', elementAtPoint === mcpCheckbox);

// 5. Check event listeners
console.log('Testing event listener registration...');
const testListener = () => console.log('✓ TEST: MCP checkbox change event fired!');
mcpCheckbox.addEventListener('change', testListener);

// 6. Test programmatic interaction
console.log('Testing programmatic interaction...');
const originalChecked = mcpCheckbox.checked;
mcpCheckbox.checked = !originalChecked;
mcpCheckbox.dispatchEvent(new Event('change'));
console.log('Programmatic toggle successful');

// Reset
mcpCheckbox.checked = originalChecked;
mcpCheckbox.removeEventListener('change', testListener);

// 7. Check for CSS interference
console.log('Checking for CSS interference...');
const tempOverride = document.createElement('style');
tempOverride.id = 'mcp-debug-override';
tempOverride.textContent = `
    #share-mcp-connections {
        pointer-events: auto !important;
        z-index: 9999 !important;
        position: relative !important;
    }
    label[for="share-mcp-connections"] {
        pointer-events: auto !important;
    }
`;
document.head.appendChild(tempOverride);
console.log('CSS override applied - try clicking the checkbox now');

// 8. Instructions for manual testing
console.log('\n=== MANUAL TESTING ===');
console.log('1. Try clicking the MCP checkbox now');
console.log('2. If it works, the issue was CSS pointer-events');
console.log('3. If it still doesn\'t work, run: document.getElementById("mcp-debug-override").remove()');
console.log('4. Then check browser console for any errors when clicking');

// 9. Monitor for click events
const clickMonitor = (e) => {
    if (e.target.id === 'share-mcp-connections') {
        console.log('✓ MCP checkbox clicked!');
    }
};
document.addEventListener('click', clickMonitor, true);

console.log('Click monitoring active. Click the MCP checkbox and watch console.');
console.log('To stop monitoring: document.removeEventListener("click", clickMonitor, true)');