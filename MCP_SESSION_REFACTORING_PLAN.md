# MCP Session Management Refactoring Plan

## Objective
Add session management to HttpTransport to support MCP servers (like Hugging Face) that require `Mcp-Session-Id` headers for stateful connections.

## Current State

### HttpTransport (lines 278-388)
- ✅ Handles HTTP-based MCP connections
- ✅ Sends initialize message
- ✅ Forwards custom headers
- ❌ **Missing**: Session ID extraction and persistence
- ❌ **Missing**: Session ID inclusion in requests

### Problem
Hugging Face MCP server flow:
1. Client sends `initialize` → Server responds with `Mcp-Session-Id` header
2. Client must include `Mcp-Session-Id` in all subsequent requests
3. Without session ID → 400/406 errors

## Refactoring Strategy

### Phase 1: Add Session Support to HttpTransport

#### 1.1 Add Session State
```javascript
class HttpTransport extends Transport {
    constructor(config) {
        super();
        this.config = config;
        this.connected = false;
        this.sessionId = null; // NEW: Track session ID
    }
}
```

#### 1.2 Extract Session from Initialize Response
```javascript
async connect() {
    const testResponse = await fetch(this.config.url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(initMessage)
    });

    // NEW: Extract session ID from response headers
    const sessionId = testResponse.headers.get('Mcp-Session-Id');
    if (sessionId) {
        this.sessionId = sessionId;
        console.log('[MCP Transport] Session ID obtained:', sessionId);
    }

    if (testResponse.ok) {
        this.connected = true;
        return;
    }
    // ... error handling
}
```

#### 1.3 Include Session in All Requests
```javascript
async send(message) {
    if (!this.connected) {
        throw new MCPTransportError('HTTP transport not connected');
    }

    const headers = {
        'Content-Type': 'application/json',
        ...this.config.headers
    };

    // NEW: Include session ID if available
    if (this.sessionId) {
        headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(this.config.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(message)
    });

    // ... rest of method
}
```

#### 1.4 Clear Session on Close
```javascript
close() {
    this.connected = false;
    this.sessionId = null; // NEW: Clear session
}
```

### Phase 2: Test Compatibility

#### 2.1 Verify Existing Connectors
- **GitHub**: Should work (doesn't use sessions)
- **Shodan**: Should work (doesn't use sessions)
- **Hugging Face**: Should now work! ✅

#### 2.2 Backwards Compatibility
- Session ID is optional (only used if server provides it)
- Existing connectors unaffected (no breaking changes)
- Session-capable servers get enhanced support

### Phase 3: Update Documentation

#### 3.1 Transport Documentation
Add to `mcp-transport-service.js`:
```javascript
/**
 * HTTP Transport for MCP
 *
 * Supports both stateless and stateful (session-based) MCP servers.
 *
 * Session Management:
 * - If server returns Mcp-Session-Id header, it's stored and included in all requests
 * - Session ID persists for the lifetime of the connection
 * - Session cleared on disconnect
 *
 * Compatible with:
 * - Stateless servers (GitHub, Shodan) - session ID ignored
 * - Stateful servers (Hugging Face) - session ID required
 */
```

#### 3.2 Connector Documentation
Update `mcp-huggingface-connector.js`:
```javascript
/**
 * Hugging Face Service Connector for MCP
 *
 * Authentication: Access Token (Bearer)
 * Transport: HTTP with session management
 *
 * Session Flow:
 * 1. Initialize connection with Bearer token
 * 2. Server returns Mcp-Session-Id
 * 3. All subsequent requests include session ID
 */
```

## Implementation Steps

### Step 1: Update HttpTransport Class
**File**: `js/services/mcp-transport-service.js`
**Lines**: 278-388
**Changes**:
1. Add `this.sessionId = null` to constructor
2. Extract session ID in `connect()` method
3. Include session ID in `send()` method
4. Clear session ID in `close()` method

**Risk**: Low (backwards compatible)
**Testing**: Verify with all 3 connectors

### Step 2: Test with Hugging Face
**Actions**:
1. Reload hacka.re (to get updated transport)
2. Try connecting to HF with token
3. Verify session ID is extracted
4. Verify initialize succeeds
5. Verify tools discovery works

**Expected**: Should now connect successfully! ✅

### Step 3: Verify Existing Connectors
**GitHub**:
- Connect → Should work (no session needed)
- List repos → Should work

**Shodan**:
- Connect → Should work (no session needed)
- DNS resolve → Should work

**Risk**: Low (session is additive, not breaking)

## Code Changes Summary

### Modified Files (1)
- `js/services/mcp-transport-service.js`
  - Lines ~280: Add sessionId property
  - Lines ~310-318: Extract session from response
  - Lines ~362-370: Include session in requests
  - Lines ~385-387: Clear session on close

### No Changes Needed
- ✅ `mcp-huggingface-connector.js` - Already ready!
- ✅ `mcp-proxy/huggingface_proxy.py` - Already forwards headers
- ✅ All other connectors - Backwards compatible

## Testing Plan

### Unit Tests (Manual)
1. **Session extraction**
   ```javascript
   // Test that session ID is extracted from headers
   const response = new Response('{}', {
       headers: {'Mcp-Session-Id': 'test-session-123'}
   });
   // Verify: transport.sessionId === 'test-session-123'
   ```

2. **Session inclusion**
   ```javascript
   // Test that session ID is included in requests
   await transport.send({method: 'test'});
   // Verify: request headers include 'Mcp-Session-Id'
   ```

### Integration Tests
1. **HF MCP connection**
   - Start proxy
   - Get HF token
   - Connect in hacka.re
   - Verify: Connection succeeds
   - Verify: Tools discovered
   - Verify: Can call HF tools

2. **Existing connectors**
   - GitHub: List repos
   - Shodan: DNS resolve
   - Verify: Still work correctly

## Rollback Plan

If issues arise:
1. Revert `mcp-transport-service.js` changes
2. Session support is isolated to HttpTransport class
3. No other files affected

## Success Criteria

- ✅ HF MCP connection succeeds
- ✅ Session ID logged in console
- ✅ Tools discovered from HF
- ✅ HF tools callable in chat
- ✅ GitHub still works
- ✅ Shodan still works
- ✅ No console errors

## Timeline

- **Step 1**: Update HttpTransport (15 min)
- **Step 2**: Test HF connection (10 min)
- **Step 3**: Verify other connectors (10 min)
- **Total**: ~35 minutes

## Risk Assessment

**Risk**: ⭐ Low
- Backwards compatible change
- Session is optional (only used if provided)
- Isolated to one class (HttpTransport)
- Easy to revert if needed

**Impact**: 🎯 High
- Enables full HF MCP support
- Completes 100% of implementation
- Future-proof for other session-based MCP servers

## Post-Implementation

1. Update `HUGGINGFACE_MCP_FINAL_STATUS.md` to 100% complete
2. Test end-to-end HF workflow
3. Document session support in README
4. Celebrate! 🎉
