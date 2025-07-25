const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    console.log('CONSOLE:', msg.type().toUpperCase(), msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  try {
    await page.goto('http://localhost:8000');
    
    // Wait for page to load and scripts to execute
    await page.waitForTimeout(3000);
    
    // Check if window.AgentContextManager exists
    const hasAgentContextManager = await page.evaluate(() => {
      return typeof window.AgentContextManager !== 'undefined';
    });
    
    console.log('AgentContextManager exists:', hasAgentContextManager);
    
    // Check if AgentService exists
    const hasAgentService = await page.evaluate(() => {
      return typeof window.AgentService !== 'undefined';
    });
    
    console.log('AgentService exists:', hasAgentService);
    
    // Check what's available on window object related to Agent
    const agentObjects = await page.evaluate(() => {
      const objects = [];
      for (const key in window) {
        if (key.toLowerCase().includes('agent')) {
          objects.push(key);
        }
      }
      return objects;
    });
    
    console.log('Agent-related objects on window:', agentObjects);
    
    // Test manual AgentContextManager call
    const manualTest = await page.evaluate(() => {
      if (window.AgentContextManager && window.AgentContextManager.switchToAgent) {
        console.log('🎯 Manual test: AgentContextManager.switchToAgent exists');
        // Test the function exists but don't call it
        return 'switchToAgent function exists';
      } else {
        return 'switchToAgent function missing';
      }
    });
    
    console.log('Manual AgentContextManager test:', manualTest);
    
  } catch (error) {
    console.log('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();