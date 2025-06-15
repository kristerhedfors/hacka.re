// Nuclear debugging - check EVERYTHING about the MCP checkbox
// Paste this in browser console and follow the instructions

console.log('🔬 NUCLEAR MCP CHECKBOX DEBUG');
console.log('==============================');

// Step 1: Basic existence check
console.log('\n1️⃣ CHECKING BASIC EXISTENCE');
const mcp = document.getElementById('share-mcp-connections');
console.log('MCP checkbox element:', mcp);
console.log('Type:', typeof mcp);
console.log('Is HTMLInputElement?', mcp instanceof HTMLInputElement);

if (!mcp) {
    console.error('❌ MCP checkbox does not exist. Stopping.');
    return;
}

// Step 2: Check all other checkboxes for comparison
console.log('\n2️⃣ CHECKING ALL CHECKBOXES IN SHARE MODAL');
const allCheckboxes = document.querySelectorAll('#share-modal input[type="checkbox"]');
console.log(`Found ${allCheckboxes.length} checkboxes:`);
allCheckboxes.forEach((cb, i) => {
    console.log(`${i + 1}. ${cb.id} - Checked: ${cb.checked}`);
});

// Step 3: Test manual clicking simulation
console.log('\n3️⃣ TESTING MANUAL INTERACTION SIMULATION');

// Remove any existing event listeners first
const newMcp = mcp.cloneNode(true);
mcp.parentNode.replaceChild(newMcp, mcp);

let clickCount = 0;
newMcp.addEventListener('click', () => {
    clickCount++;
    console.log(`🖱️ MCP checkbox clicked ${clickCount} times`);
});

newMcp.addEventListener('change', () => {
    console.log(`📝 MCP checkbox changed to: ${newMcp.checked}`);
});

console.log('Try clicking the MCP checkbox now...');

// Step 4: Check for invisible overlays
console.log('\n4️⃣ CHECKING FOR INVISIBLE OVERLAYS');
const rect = newMcp.getBoundingClientRect();
console.log('MCP checkbox position:', rect);

// Check what's actually at the checkbox location
const elementsAtLocation = [];
for (let i = 0; i < 10; i++) {
    const x = rect.left + (rect.width / 10) * i;
    const y = rect.top + rect.height / 2;
    const elem = document.elementFromPoint(x, y);
    if (elem && !elementsAtLocation.includes(elem)) {
        elementsAtLocation.push(elem);
    }
}

console.log('Elements found at checkbox location:');
elementsAtLocation.forEach((elem, i) => {
    console.log(`${i + 1}. ${elem.tagName}#${elem.id}.${elem.className}`);
});

// Step 5: Force visibility and interaction
console.log('\n5️⃣ FORCING VISIBILITY AND INTERACTION');
newMcp.style.cssText = `
    position: relative !important;
    z-index: 999999 !important;
    pointer-events: auto !important;
    opacity: 1 !important;
    visibility: visible !important;
    display: inline-block !important;
    width: 20px !important;
    height: 20px !important;
    background: red !important;
    border: 3px solid blue !important;
`;

console.log('MCP checkbox now has FORCED styling (red background, blue border)');
console.log('Try clicking it now - you should see a red/blue checkbox');

// Step 6: Create a completely new checkbox
console.log('\n6️⃣ CREATING BRAND NEW MCP CHECKBOX');
const parent = newMcp.parentElement;
const newCheckbox = document.createElement('input');
newCheckbox.type = 'checkbox';
newCheckbox.id = 'share-mcp-connections-new';
newCheckbox.style.cssText = 'margin: 10px; width: 20px; height: 20px; background: green;';

const newLabel = document.createElement('label');
newLabel.setAttribute('for', 'share-mcp-connections-new');
newLabel.textContent = 'NEW MCP Connections (should work)';
newLabel.style.cssText = 'margin: 10px; color: green; font-weight: bold;';

newCheckbox.addEventListener('change', () => {
    console.log('🎉 NEW MCP checkbox works! Checked:', newCheckbox.checked);
});

parent.appendChild(document.createElement('br'));
parent.appendChild(newCheckbox);
parent.appendChild(newLabel);

console.log('\n📋 SUMMARY OF TESTS:');
console.log('- Original MCP checkbox should be red/blue');
console.log('- New green MCP checkbox should work normally');
console.log('- Check console for click/change events');
console.log('- Try clicking both checkboxes');

console.log('\n⏱️ Waiting for your clicks...');
setTimeout(() => {
    console.log(`\n📊 RESULTS AFTER 10 SECONDS:`);
    console.log(`Original MCP clicks: ${clickCount}`);
    console.log(`New MCP checked: ${newCheckbox.checked}`);
}, 10000);