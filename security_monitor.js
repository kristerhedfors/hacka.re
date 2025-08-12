/**
 * CRITICAL SECURITY MONITOR: Alert on unauthorized localStorage keys
 * 
 * This script monitors localStorage and shows an alert if ANY non-hackare_ prefixed
 * keys are found, as these bypass the encrypted storage system.
 * 
 * SECURITY POLICY:
 * - localStorage: ONLY hackare_ prefixed keys allowed (encrypted)
 * - sessionStorage: More lax - allows __hacka_re_storage_type__ and __hacka_re_session_key_*
 */

function checkStorageSecurity() {
    console.log('🔐 SECURITY MONITOR: Checking localStorage for unauthorized keys...');
    
    // STRICT: localStorage should ONLY contain hackare_ prefixed keys
    const ALLOWED_LOCALSTORAGE_PATTERNS = [
        /^hackare_/,  // ONLY hackare_ prefixed keys allowed (encrypted + cross-tab sync)
    ];
    
    // More lax for sessionStorage
    const ALLOWED_SESSIONSTORAGE_PATTERNS = [
        /^hackare_/,                    // Encrypted keys
        /^__hacka_re_storage_type__$/,  // Storage type indicator
        /^__hacka_re_session_key_/,     // Session keys for shared links
    ];
    
    // Check localStorage (STRICT)
    const unauthorizedLocalKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !ALLOWED_LOCALSTORAGE_PATTERNS.some(pattern => pattern.test(key))) {
            const value = localStorage.getItem(key);
            unauthorizedLocalKeys.push({
                key: key,
                value: value ? value.substring(0, 100) : 'null',
                valueLength: value ? value.length : 0
            });
        }
    }
    
    // Check sessionStorage (more lax)
    const unauthorizedSessionKeys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !ALLOWED_SESSIONSTORAGE_PATTERNS.some(pattern => pattern.test(key))) {
            const value = sessionStorage.getItem(key);
            unauthorizedSessionKeys.push({
                key: key,
                value: value ? value.substring(0, 100) : 'null',
                valueLength: value ? value.length : 0
            });
        }
    }
    
    // ALERT if any unauthorized keys found
    if (unauthorizedLocalKeys.length > 0) {
        const message = `🚨 CRITICAL SECURITY BREACH DETECTED! 🚨

${unauthorizedLocalKeys.length} unauthorized localStorage keys found:

${unauthorizedLocalKeys.map((item, i) => 
    `${i + 1}. "${item.key}" (${item.valueLength} chars): ${item.value}`
).join('\n')}

❌ SECURITY POLICY VIOLATION:
- localStorage MUST only contain hackare_ prefixed encrypted keys
- These keys contain UNENCRYPTED sensitive data
- This completely bypasses the security model

🔧 IMMEDIATE ACTION REQUIRED:
- Check AgentContextManager and other services
- Migrate data to encrypted storage
- Remove unauthorized keys

Press OK to continue, but fix this immediately!`;
        
        alert(message);
        console.error('🚨 SECURITY BREACH:', unauthorizedLocalKeys);
        return false;
    }
    
    if (unauthorizedSessionKeys.length > 0) {
        const message = `⚠️  SESSIONSTORAGE POLICY VIOLATION ⚠️

${unauthorizedSessionKeys.length} unauthorized sessionStorage keys found:

${unauthorizedSessionKeys.map((item, i) => 
    `${i + 1}. "${item.key}" (${item.valueLength} chars): ${item.value}`
).join('\n')}

Only allowed: hackare_ prefixes, __hacka_re_storage_type__, __hacka_re_session_key_*

Consider if these keys should be encrypted or removed.`;
        
        alert(message);
        console.warn('⚠️  sessionStorage policy violation:', unauthorizedSessionKeys);
    }
    
    if (unauthorizedLocalKeys.length === 0 && unauthorizedSessionKeys.length === 0) {
        console.log('✅ Storage security check passed - all keys follow proper patterns');
        return true;
    }
    
    return unauthorizedLocalKeys.length === 0;  // Only localStorage violations are critical
}

// Run check immediately
checkStorageSecurity();

// Also run check periodically
setInterval(checkStorageSecurity, 10000);  // Check every 10 seconds

// Export for manual checks
window.checkStorageSecurity = checkStorageSecurity;