// Debug event interference - find what's blocking the MCP checkbox
// Paste this in browser console with share modal open

(function() {
    console.log('🚫 DEBUGGING EVENT INTERFERENCE');
    console.log('================================');

    const mcpCheckbox = document.getElementById('share-mcp-connections');
    const workingCheckbox = document.getElementById('share-function-library');

    if (!mcpCheckbox || !workingCheckbox) {
        console.error('Could not find checkboxes');
        return;
    }

    // Intercept all events on both checkboxes
    console.log('\n🎯 INTERCEPTING ALL EVENTS');

    // Event types to monitor
    const events = ['click', 'mousedown', 'mouseup', 'change', 'input', 'focus', 'blur'];

    // Monitor working checkbox
    events.forEach(eventType => {
        workingCheckbox.addEventListener(eventType, (e) => {
            console.log(`✅ WORKING checkbox: ${eventType} event`);
        }, true); // Use capture phase
    });

    // Monitor MCP checkbox
    events.forEach(eventType => {
        mcpCheckbox.addEventListener(eventType, (e) => {
            console.log(`❌ MCP checkbox: ${eventType} event`);
        }, true); // Use capture phase
    });

    // Intercept ALL events on the document to see what's happening
    console.log('\n🌐 MONITORING ALL DOCUMENT EVENTS');

    let eventLog = [];
    const documentHandler = (e) => {
        if (e.target === mcpCheckbox || e.target === workingCheckbox) {
            const entry = {
                type: e.type,
                target: e.target.id,
                defaultPrevented: e.defaultPrevented,
                propagationStopped: e.cancelBubble,
                timestamp: Date.now()
            };
            eventLog.push(entry);
            console.log(`📡 Document event: ${entry.type} on ${entry.target}, prevented: ${entry.defaultPrevented}, stopped: ${entry.propagationStopped}`);
        }
    };

    // Monitor in both capture and bubble phases
    events.forEach(eventType => {
        document.addEventListener(eventType, documentHandler, true); // Capture
        document.addEventListener(eventType, documentHandler, false); // Bubble
    });

    // Test programmatic interaction
    console.log('\n🤖 TESTING PROGRAMMATIC INTERACTION');
    
    const testProgrammatic = (checkbox, name) => {
        console.log(`Testing ${name}...`);
        const originalChecked = checkbox.checked;
        
        // Test direct property change
        checkbox.checked = !originalChecked;
        console.log(`${name} direct property change: ${checkbox.checked}`);
        
        // Test event dispatch
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`${name} event dispatched`);
        
        // Reset
        checkbox.checked = originalChecked;
    };

    testProgrammatic(workingCheckbox, 'Working checkbox');
    testProgrammatic(mcpCheckbox, 'MCP checkbox');

    console.log('\n🖱️ MANUAL TEST INSTRUCTIONS:');
    console.log('1. Click the working Function Library checkbox');
    console.log('2. Click the MCP Connections checkbox');
    console.log('3. Compare the event logs in console');

    // Summary after 15 seconds
    setTimeout(() => {
        console.log('\n📊 EVENT LOG SUMMARY:');
        const mcpEvents = eventLog.filter(e => e.target === 'share-mcp-connections');
        const workingEvents = eventLog.filter(e => e.target === 'share-function-library');
        
        console.log(`MCP checkbox events: ${mcpEvents.length}`);
        console.log(`Working checkbox events: ${workingEvents.length}`);
        
        if (mcpEvents.length === 0) {
            console.log('🚨 MCP checkbox received NO events - something is blocking them!');
        } else {
            console.log('MCP checkbox events:', mcpEvents);
        }
        
        if (workingEvents.length > 0) {
            console.log('Working checkbox events:', workingEvents);
        }

        // Cleanup
        events.forEach(eventType => {
            document.removeEventListener(eventType, documentHandler, true);
            document.removeEventListener(eventType, documentHandler, false);
        });
        
        console.log('\n🧹 Event monitoring cleaned up');
    }, 15000);

    console.log('\n⏰ Monitoring for 15 seconds...');
})();