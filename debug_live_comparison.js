// Debug script: Compare working vs non-working checkbox in live application
// Run this in browser console with share modal open

console.log('=== Live Checkbox Comparison Debug ===');

// Test both a working checkbox and the broken MCP checkbox
const workingCheckbox = document.getElementById('share-function-library');
const brokenCheckbox = document.getElementById('share-mcp-connections');

console.log('Working checkbox (Function Library):', !!workingCheckbox);
console.log('Broken checkbox (MCP Connections):', !!brokenCheckbox);

if (!workingCheckbox || !brokenCheckbox) {
    console.error('Could not find both checkboxes');
    console.log('Available checkboxes:', Array.from(document.querySelectorAll('input[type="checkbox"]')).map(cb => cb.id));
    return;
}

// Compare properties
function compareCheckboxes(working, broken) {
    console.log('\n=== COMPARISON ===');
    
    const props = ['checked', 'disabled', 'type', 'id', 'className'];
    props.forEach(prop => {
        console.log(`${prop}:`, {
            working: working[prop], 
            broken: broken[prop],
            same: working[prop] === broken[prop]
        });
    });
    
    // Compare computed styles
    const workingStyle = window.getComputedStyle(working);
    const brokenStyle = window.getComputedStyle(broken);
    
    const styleProps = ['display', 'visibility', 'pointerEvents', 'zIndex', 'position'];
    console.log('\n=== COMPUTED STYLES ===');
    styleProps.forEach(prop => {
        console.log(`${prop}:`, {
            working: workingStyle[prop], 
            broken: brokenStyle[prop],
            same: workingStyle[prop] === brokenStyle[prop]
        });
    });
    
    // Compare positions
    const workingRect = working.getBoundingClientRect();
    const brokenRect = broken.getBoundingClientRect();
    
    console.log('\n=== POSITIONS ===');
    console.log('Working checkbox rect:', workingRect);
    console.log('Broken checkbox rect:', brokenRect);
    
    // Check what's at the center of each checkbox
    const workingCenter = document.elementFromPoint(
        workingRect.left + workingRect.width/2, 
        workingRect.top + workingRect.height/2
    );
    const brokenCenter = document.elementFromPoint(
        brokenRect.left + brokenRect.width/2, 
        brokenRect.top + brokenRect.height/2
    );
    
    console.log('\n=== ELEMENT AT CENTER POINT ===');
    console.log('Working checkbox center element:', workingCenter);
    console.log('Is it the checkbox?', workingCenter === working);
    console.log('Broken checkbox center element:', brokenCenter);
    console.log('Is it the checkbox?', brokenCenter === broken);
    
    if (brokenCenter !== broken) {
        console.log('❌ FOUND THE PROBLEM: Something else is covering the broken checkbox!');
        console.log('Covering element:', brokenCenter);
        console.log('Covering element classes:', brokenCenter.className);
        console.log('Covering element id:', brokenCenter.id);
    }
}

compareCheckboxes(workingCheckbox, brokenCheckbox);

// Test event listeners
console.log('\n=== TESTING EVENT LISTENERS ===');

let workingClicked = false;
let brokenClicked = false;

const workingListener = () => {
    workingClicked = true;
    console.log('✅ Working checkbox event fired');
};

const brokenListener = () => {
    brokenClicked = true;
    console.log('✅ Broken checkbox event fired');
};

workingCheckbox.addEventListener('change', workingListener);
brokenCheckbox.addEventListener('change', brokenListener);

// Test programmatic triggers
console.log('Triggering events programmatically...');
workingCheckbox.dispatchEvent(new Event('change'));
brokenCheckbox.dispatchEvent(new Event('change'));

setTimeout(() => {
    console.log('Working checkbox listener fired:', workingClicked);
    console.log('Broken checkbox listener fired:', brokenClicked);
    
    // Cleanup
    workingCheckbox.removeEventListener('change', workingListener);
    brokenCheckbox.removeEventListener('change', brokenListener);
    
    console.log('\n=== CONCLUSION ===');
    if (brokenClicked) {
        console.log('✅ Broken checkbox CAN receive events programmatically');
        console.log('❌ Issue is with USER INTERACTION (mouse/click)');
    } else {
        console.log('❌ Broken checkbox CANNOT receive events at all');
        console.log('❌ Issue is with the element itself');
    }
}, 100);

console.log('\n=== MANUAL TEST ===');
console.log('Now manually click both checkboxes and see which console messages appear');