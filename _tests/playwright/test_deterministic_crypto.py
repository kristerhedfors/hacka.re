import pytest
from playwright.sync_api import Page, expect
import json
import base64
import time

"""
Test for the Deterministic Crypto System

This test verifies that the deterministic crypto system works correctly by:
1. Loading a test page that includes the deterministic-crypto.js library
2. Generating deterministic key pairs
3. Encrypting and decrypting messages
4. Verifying that the same inputs produce the same keys
"""

@pytest.fixture
def setup_page(page: Page):
    # Create a simple test page that includes the necessary libraries
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Deterministic Crypto Test</title>
        <script src="/lib/tweetnacl/nacl-fast.min.js"></script>
        <script src="/lib/tweetnacl/nacl-util.min.js"></script>
        <script src="/js/utils/deterministic-crypto.js"></script>
        <script>
            // Test results will be stored here
            window.testResults = {};
            
            // Function to run the tests
            function runTests() {
                try {
                    // Test configuration
                    const masterKey = "test-master-key-12345";
                    const namespace = "test-namespace";
                    const serverProgramName = "test-server";
                    const clientProgramName = "test-client";
                    
                    // Test 1: Generate deterministic key pairs
                    const serverKeyPair1 = DeterministicCrypto.generateKeyPair(
                        masterKey,
                        namespace,
                        serverProgramName
                    );
                    
                    const clientKeyPair1 = DeterministicCrypto.generateKeyPair(
                        masterKey,
                        namespace,
                        clientProgramName
                    );
                    
                    // Test 2: Generate the same key pairs again to verify determinism
                    const serverKeyPair2 = DeterministicCrypto.generateKeyPair(
                        masterKey,
                        namespace,
                        serverProgramName
                    );
                    
                    const clientKeyPair2 = DeterministicCrypto.generateKeyPair(
                        masterKey,
                        namespace,
                        clientProgramName
                    );
                    
                    // Test 3: Encrypt a message
                    const originalMessage = {
                        id: "test-message-" + Date.now(),
                        text: "Hello, this is a test message!",
                        timestamp: new Date().toISOString()
                    };
                    
                    const encrypted = DeterministicCrypto.encrypt(
                        originalMessage,
                        clientKeyPair1.publicKey,
                        serverKeyPair1.secretKey
                    );
                    
                    // Test 4: Decrypt the message
                    const decrypted = DeterministicCrypto.decrypt(
                        encrypted,
                        serverKeyPair1.publicKey,
                        clientKeyPair1.secretKey
                    );
                    
                    // Store test results
                    window.testResults = {
                        serverPublicKey1: nacl.util.encodeBase64(serverKeyPair1.publicKey),
                        serverPublicKey2: nacl.util.encodeBase64(serverKeyPair2.publicKey),
                        clientPublicKey1: nacl.util.encodeBase64(clientKeyPair1.publicKey),
                        clientPublicKey2: nacl.util.encodeBase64(clientKeyPair2.publicKey),
                        originalMessage: originalMessage,
                        encrypted: encrypted,
                        decrypted: decrypted,
                        keysMatch: {
                            server: nacl.util.encodeBase64(serverKeyPair1.publicKey) === 
                                   nacl.util.encodeBase64(serverKeyPair2.publicKey),
                            client: nacl.util.encodeBase64(clientKeyPair1.publicKey) === 
                                   nacl.util.encodeBase64(clientKeyPair2.publicKey)
                        },
                        decryptionSuccessful: JSON.stringify(originalMessage) === JSON.stringify(decrypted)
                    };
                    
                    document.getElementById('results').textContent = 
                        JSON.stringify(window.testResults, null, 2);
                    
                    document.getElementById('status').textContent = 'Tests completed successfully';
                    document.getElementById('status').style.color = 'green';
                } catch (error) {
                    document.getElementById('status').textContent = 'Tests failed: ' + error.message;
                    document.getElementById('status').style.color = 'red';
                    console.error(error);
                }
            }
        </script>
    </head>
    <body>
        <h1>Deterministic Crypto Test</h1>
        <button id="run-tests" onclick="runTests()">Run Tests</button>
        <div>
            <h2>Status: <span id="status">Not started</span></h2>
        </div>
        <div>
            <h2>Results:</h2>
            <pre id="results"></pre>
        </div>
    </body>
    </html>
    """
    
    # Create a data URL from the HTML content
    data_url = f"data:text/html;base64,{base64.b64encode(html_content.encode()).decode()}"
    
    # Navigate to the data URL
    page.goto(data_url)
    
    return page

def test_deterministic_crypto(setup_page):
    page = setup_page
    
    # Click the button to run the tests
    page.click('#run-tests')
    
    # Wait for the tests to complete
    page.wait_for_selector('#status:has-text("Tests completed successfully")')
    
    # Get the test results
    test_results = page.evaluate('window.testResults')
    
    # Verify that the keys are deterministic
    assert test_results['keysMatch']['server'] == True, "Server keys should match"
    assert test_results['keysMatch']['client'] == True, "Client keys should match"
    
    # Verify that encryption and decryption work
    assert test_results['decryptionSuccessful'] == True, "Decryption should be successful"
    
    # Verify that the encrypted data is a base64 string
    try:
        base64.b64decode(test_results['encrypted'])
    except:
        pytest.fail("Encrypted data should be a valid base64 string")
    
    # Verify that the original and decrypted messages match
    assert test_results['originalMessage']['text'] == test_results['decrypted']['text'], \
        "Original and decrypted message texts should match"
    
    # Take a screenshot for reference
    page.screenshot(path="_tests/playwright/screenshots/deterministic_crypto_test.png")
    
    # Print success message
    print("Deterministic crypto test passed successfully!")

def test_different_inputs_produce_different_keys(setup_page):
    page = setup_page
    
    # Define a JavaScript function to test different inputs
    page.evaluate("""
    function testDifferentInputs() {
        const baseKey = "test-master-key";
        const baseNamespace = "test-namespace";
        const baseProgramName = "test-program";
        
        // Generate a reference key pair
        const referenceKeyPair = DeterministicCrypto.generateKeyPair(
            baseKey,
            baseNamespace,
            baseProgramName
        );
        
        // Test with different master keys
        const differentMasterKeyPair = DeterministicCrypto.generateKeyPair(
            baseKey + "-different",
            baseNamespace,
            baseProgramName
        );
        
        // Test with different namespaces
        const differentNamespacePair = DeterministicCrypto.generateKeyPair(
            baseKey,
            baseNamespace + "-different",
            baseProgramName
        );
        
        // Test with different program names
        const differentProgramPair = DeterministicCrypto.generateKeyPair(
            baseKey,
            baseNamespace,
            baseProgramName + "-different"
        );
        
        // Store results
        window.differentInputsResults = {
            referencePublicKey: nacl.util.encodeBase64(referenceKeyPair.publicKey),
            differentMasterKeyPublicKey: nacl.util.encodeBase64(differentMasterKeyPair.publicKey),
            differentNamespacePublicKey: nacl.util.encodeBase64(differentNamespacePair.publicKey),
            differentProgramPublicKey: nacl.util.encodeBase64(differentProgramPair.publicKey),
            allDifferent: 
                nacl.util.encodeBase64(referenceKeyPair.publicKey) !== nacl.util.encodeBase64(differentMasterKeyPair.publicKey) &&
                nacl.util.encodeBase64(referenceKeyPair.publicKey) !== nacl.util.encodeBase64(differentNamespacePair.publicKey) &&
                nacl.util.encodeBase64(referenceKeyPair.publicKey) !== nacl.util.encodeBase64(differentProgramPair.publicKey)
        };
        
        return window.differentInputsResults;
    }
    """)
    
    # Run the test
    different_inputs_results = page.evaluate('testDifferentInputs()')
    
    # Verify that different inputs produce different keys
    assert different_inputs_results['allDifferent'] == True, "Different inputs should produce different keys"
    
    # Print success message
    print("Different inputs test passed successfully!")

def test_encrypt_decrypt_multiple_messages(setup_page):
    page = setup_page
    
    # Define a JavaScript function to test multiple messages
    page.evaluate("""
    function testMultipleMessages() {
        const masterKey = "test-master-key-12345";
        const namespace = "test-namespace";
        const serverProgramName = "test-server";
        const clientProgramName = "test-client";
        
        // Generate key pairs
        const serverKeyPair = DeterministicCrypto.generateKeyPair(
            masterKey,
            namespace,
            serverProgramName
        );
        
        const clientKeyPair = DeterministicCrypto.generateKeyPair(
            masterKey,
            namespace,
            clientProgramName
        );
        
        // Test with multiple messages
        const messages = [
            { id: "msg1", text: "First message", value: 123 },
            { id: "msg2", text: "Second message", array: [1, 2, 3] },
            { id: "msg3", text: "Third message", nested: { key: "value" } }
        ];
        
        const results = [];
        
        for (const message of messages) {
            // Encrypt
            const encrypted = DeterministicCrypto.encrypt(
                message,
                clientKeyPair.publicKey,
                serverKeyPair.secretKey
            );
            
            // Decrypt
            const decrypted = DeterministicCrypto.decrypt(
                encrypted,
                serverKeyPair.publicKey,
                clientKeyPair.secretKey
            );
            
            // Check if original and decrypted match
            const match = JSON.stringify(message) === JSON.stringify(decrypted);
            
            results.push({
                original: message,
                decrypted: decrypted,
                match: match
            });
        }
        
        // Store results
        window.multipleMessagesResults = {
            results: results,
            allSuccessful: results.every(r => r.match)
        };
        
        return window.multipleMessagesResults;
    }
    """)
    
    # Run the test
    multiple_messages_results = page.evaluate('testMultipleMessages()')
    
    # Verify that all messages were encrypted and decrypted successfully
    assert multiple_messages_results['allSuccessful'] == True, "All messages should be encrypted and decrypted successfully"
    
    # Print success message
    print("Multiple messages test passed successfully!")
