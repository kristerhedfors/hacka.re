// Debug why event listener is not attached to MCP checkbox
// Paste this in browser console

(function() {
    console.log('🔍 DEBUGGING EVENT LISTENER ATTACHMENT');
    console.log('=====================================');

    // Check DOMElements module
    console.log('\n1️⃣ CHECKING DOM ELEMENTS MODULE');
    
    if (window.DOMElements) {
        const elements = window.DOMElements.getElements();
        console.log('DOMElements found:', !!window.DOMElements);
        console.log('shareMcpConnectionsCheckbox:', elements.shareMcpConnectionsCheckbox);
        console.log('shareFunctionLibraryCheckbox (working):', elements.shareFunctionLibraryCheckbox);
        
        // Compare them
        if (elements.shareMcpConnectionsCheckbox) {
            console.log('✅ MCP checkbox found in DOMElements');
        } else {
            console.log('❌ MCP checkbox NOT found in DOMElements');
        }
    } else {
        console.log('❌ DOMElements module not found');
    }

    // Check AIHackare instance
    console.log('\n2️⃣ CHECKING AIHACKARE INSTANCE');
    
    if (window.aiHackare) {
        console.log('AIHackare instance found:', !!window.aiHackare);
        console.log('AIHackare elements:', window.aiHackare.elements);
        
        if (window.aiHackare.elements) {
            console.log('MCP checkbox in AIHackare:', window.aiHackare.elements.shareMcpConnectionsCheckbox);
            console.log('Function checkbox in AIHackare:', window.aiHackare.elements.shareFunctionLibraryCheckbox);
        }
    } else {
        console.log('❌ AIHackare instance not found');
    }

    // Manually attach event listener to test
    console.log('\n3️⃣ MANUALLY ATTACHING EVENT LISTENER');
    
    const mcpCheckbox = document.getElementById('share-mcp-connections');
    if (mcpCheckbox) {
        mcpCheckbox.addEventListener('change', () => {
            console.log('🎉 MANUAL event listener fired! MCP checkbox is:', mcpCheckbox.checked);
            
            // Manually trigger updateLinkLengthBar if available
            if (window.aiHackare && typeof window.aiHackare.updateLinkLengthBar === 'function') {
                console.log('📏 Manually triggering updateLinkLengthBar...');
                window.aiHackare.updateLinkLengthBar();
            }
        });
        
        console.log('✅ Manual event listener attached to MCP checkbox');
        console.log('🖱️ Try clicking the MCP checkbox now - you should see the manual event fire');
    } else {
        console.log('❌ Could not find MCP checkbox to attach manual listener');
    }

    // Check existing event listeners
    console.log('\n4️⃣ CHECKING EXISTING EVENT LISTENERS');
    
    // Try to trigger events and see what responds
    const allCheckboxes = document.querySelectorAll('#share-modal input[type="checkbox"]');
    console.log(`Found ${allCheckboxes.length} checkboxes in share modal`);
    
    allCheckboxes.forEach((checkbox, i) => {
        console.log(`${i + 1}. ${checkbox.id}`);
        
        // Test if clicking triggers any application logic
        const originalChecked = checkbox.checked;
        checkbox.checked = !originalChecked;
        checkbox.dispatchEvent(new Event('change'));
        checkbox.checked = originalChecked; // Reset
    });

    console.log('\n🧪 DIAGNOSIS:');
    console.log('If you see "MANUAL event listener fired!" when clicking MCP checkbox,');
    console.log('then the issue is that the application event listener was never attached.');
})();