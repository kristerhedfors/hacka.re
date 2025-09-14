// Node.js script to generate a test URL using the JavaScript implementation
const fs = require('fs');
const vm = require('vm');

// Read necessary files
const tweetnacl = fs.readFileSync('lib/tweetnacl.min.js', 'utf8');
const tweetnaclUtil = fs.readFileSync('lib/tweetnacl-util.min.js', 'utf8');
const cryptoUtils = fs.readFileSync('js/utils/crypto-utils.js', 'utf8');

// Create a sandbox environment
const sandbox = {
    window: {},
    nacl: null,
    console: console
};

// Execute the scripts in order
vm.runInNewContext(tweetnacl, sandbox);
sandbox.nacl = sandbox.window.nacl;

vm.runInNewContext(tweetnaclUtil, sandbox);
sandbox.nacl.util = sandbox.window.nacl.util;

sandbox.window.CryptoUtils = null;
vm.runInNewContext(cryptoUtils, sandbox);

// Now use CryptoUtils to generate a test URL
const CryptoUtils = sandbox.window.CryptoUtils;

// Test data - same as Go test
const testConfig = {
    apiKey: "test-api-key-123",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4",
    maxTokens: 2000,
    temperature: 0.7,
    systemPrompt: "You are a helpful assistant.",
    functions: [
        {
            name: "testFunction",
            code: "function test() { return 'hello'; }",
            description: "Test function",
            enabled: true
        }
    ]
};

const password = "testPassword123";
const jsonData = JSON.stringify(testConfig);

// Encrypt using the JS implementation
const encrypted = CryptoUtils.encryptShareLink(jsonData, password, true);
const url = `https://hacka.re/#gpt=${encrypted}`;

console.log("=== JavaScript Generated URL ===");
console.log("Password:", password);
console.log("URL:", url);
console.log();

// Test decryption
const decrypted = CryptoUtils.decryptData(encrypted, password);
if (decrypted) {
    console.log("✓ JS Decryption successful");
    
    // Extract salt and nonce for namespace derivation
    const data = CryptoUtils.decodeBase64UrlSafe(encrypted);
    const salt = data.slice(0, 10);
    const nonce = data.slice(10, 20);
    
    // Derive master key and namespace
    const decryptionKey = CryptoUtils.deriveDecryptionKey(password, salt);
    const masterKey = CryptoUtils.deriveMasterKey(password, salt, nonce);
    const namespaceHash = CryptoUtils.deriveNamespaceHash(decryptionKey, masterKey, nonce);
    const namespace = namespaceHash.substring(0, 8);
    
    console.log("Namespace:", namespace);
    console.log("Master Key:", masterKey.substring(0, 16) + "...");
} else {
    console.log("✗ JS Decryption failed");
}

// Output just the URL for piping to Go test
console.log();
console.log("URL_FOR_GO_TEST:", url);