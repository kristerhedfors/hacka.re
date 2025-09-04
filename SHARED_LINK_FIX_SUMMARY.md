# Shared Link Conversation Persistence Fix

## Problem
When re-opening a shared link, the conversation data was not being restored even though it existed in localStorage. The issue was that the master key from the share link payload wasn't properly cached for decrypting the existing conversation data.

## Root Cause
1. When a shared link is opened, the master key is extracted from the payload and stored in `window._sharedLinkMasterKey`
2. The namespace service checks for this master key but it might not be available at the right time
3. When trying to load conversation history, decryption would fail due to missing master key
4. The `getMasterKey` function only checked `window._sharedLinkMasterKey` but not the cached values

## Solution Implemented

### 1. Enhanced Master Key Caching (namespace-service.js)
- Modified `getMasterKey` function to check all master key caches:
  - `window._sharedLinkMasterKey` 
  - `sharedLinkMasterKeyCache`
  - `state.current.sharedLinkMasterKey`
- Added `ensureSharedLinkMasterKeyCached()` function to explicitly cache the master key
- Updates all caches when any master key is found to ensure consistency

### 2. Improved Shared Link Processing (shared-link-data-processor.js)
- Added explicit master key caching before attempting to reload conversation
- Increased delay from 100ms to 500ms to ensure proper initialization
- Added verification that namespace has master key before reload

### 3. Files Modified
- `/js/services/namespace-service.js`: Enhanced master key caching and retrieval
- `/js/components/settings/shared-link-data-processor.js`: Added master key verification before reload

## Testing Instructions

1. **Setup**:
   - Start the HTTP server: `./scripts/start_server.sh`
   - Open http://localhost:8000 directly (not via share link)
   - Have a conversation with several messages

2. **Create Share Link**:
   - Click Share button
   - Enable "Include Conversation"
   - Set a password (e.g., "test123")
   - Create and copy the share link

3. **Test Persistence**:
   - Open the share link in a new tab
   - Enter the password - conversation should load
   - Close the tab completely
   - Re-open the same share link
   - Enter the password again
   - **Expected**: Conversation should load from localStorage

4. **Verify in Console**:
   Look for these messages indicating success:
   - `[CRYPTO] Using master key from share link (memory only)`
   - `[SharedLinkDataProcessor] Master key cached: true`
   - `[ChatManager] Reloading conversation history`

## Technical Details

### Master Key Flow for Shared Links
1. User enters password to decrypt share link payload
2. Master key is extracted and stored in `window._sharedLinkMasterKey`
3. `ensureSharedLinkMasterKeyCached()` caches it in multiple locations
4. When decrypting conversation data, all caches are checked
5. Master key is never stored to disk for shared links (security)

### Key Security Principles Maintained
- Master keys for shared links are NEVER stored in localStorage/sessionStorage
- Master keys are only kept in memory variables
- Page reload requires re-entering password for shared links
- Direct visits store master key in sessionStorage (ephemeral, allows reload)

## Test File
Use `test_shared_link_persistence.html` to verify the fix:
```bash
open http://localhost:8000/test_shared_link_persistence.html
```

This provides a guided test flow with debug logging to verify shared link persistence works correctly.