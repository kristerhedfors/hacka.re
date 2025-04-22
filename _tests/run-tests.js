/**
 * Test Runner Script
 * 
 * This script runs the tests in a headless browser using Puppeteer.
 * It's useful for automated testing in CI/CD pipelines.
 * 
 * Usage:
 *   npm install puppeteer
 *   node _tests/run-tests.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function runTests() {
  // Launch a headless browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Load the test runner page
  const testRunnerPath = path.join(__dirname, 'test-runner.html');
  const testRunnerUrl = `file://${testRunnerPath}`;
  
  // Capture console messages
  page.on('console', msg => {
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });
  
  await page.goto(testRunnerUrl);
  
  // Wait for tests to complete
  await page.waitForFunction(() => {
    return document.querySelector('#summary') && 
           document.querySelector('#summary').textContent.includes('tests');
  });
  
  // Get test results
  const testResults = await page.evaluate(() => {
    const summary = document.querySelector('#summary').textContent;
    const passed = summary.match(/(\d+) passed/)[1];
    const failed = summary.match(/(\d+) failed/)[1];
    const total = summary.match(/(\d+) tests/)[1];
    
    return {
      summary,
      passed: parseInt(passed),
      failed: parseInt(failed),
      total: parseInt(total)
    };
  });
  
  // Output results
  console.log(testResults.summary.trim());
  
  // If there are failures, get the failure details
  if (testResults.failed > 0) {
    const failures = await page.evaluate(() => {
      const failureElements = document.querySelectorAll('.test-case .fail');
      return Array.from(failureElements).map(el => el.parentNode.textContent.trim());
    });
    
    console.log('\nFailures:');
    failures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure}`);
    });
  }
  
  // Close the browser
  await browser.close();
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
