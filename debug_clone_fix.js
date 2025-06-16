// Nuclear approach: Clone a working checkbox to replace the broken one
// Run this in browser console with share modal open

console.log('=== Clone Working Checkbox to Fix MCP ===');

const workingGroup = document.querySelector('input[id="share-function-library"]').parentElement;
const brokenGroup = document.querySelector('input[id="share-mcp-connections"]').parentElement;

console.log('Working group found:', !!workingGroup);
console.log('Broken group found:', !!brokenGroup);

if (workingGroup && brokenGroup) {
    // Clone the working checkbox structure
    const clonedGroup = workingGroup.cloneNode(true);
    
    // Update the cloned elements for MCP
    const clonedInput = clonedGroup.querySelector('input');
    const clonedLabel = clonedGroup.querySelector('label');
    
    clonedInput.id = 'share-mcp-connections';
    clonedLabel.setAttribute('for', 'share-mcp-connections');
    clonedLabel.textContent = 'MCP Connections';
    
    // Replace the broken group with the cloned working one
    brokenGroup.parentElement.replaceChild(clonedGroup, brokenGroup);
    
    console.log('✅ Replaced broken MCP checkbox with cloned working one');
    console.log('Try clicking the MCP checkbox now - it should work!');
    
    // Add event listener to test
    clonedInput.addEventListener('change', () => {
        console.log('🎉 Cloned MCP checkbox works! Checked:', clonedInput.checked);
    });
} else {
    console.error('Could not find checkbox groups to clone');
}