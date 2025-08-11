# Namespace and Storage Guide for hacka.re

This guide explains how hacka.re uses namespaces and storage types to provide both privacy and functionality.

## Overview

hacka.re uses a sophisticated namespace system to isolate different chat contexts while providing flexibility in how data is stored. The system automatically determines whether to use temporary session storage or persistent local storage based on how you access the application.

## How Storage Type is Determined

### Direct Visit → Session Storage (Maximum Privacy)

When you visit hacka.re directly by typing the URL or using a bookmark:
- **Storage Type**: `sessionStorage` (temporary)
- **Data Persistence**: Only while the browser tab is open
- **Privacy Level**: Maximum - all data is cleared when you close the tab
- **Namespace**: Uses a fixed `default_session` namespace

**Example**: Navigating to `https://hacka.re`

### Shared Link → Local Storage (Persistent Conversations)

When you access hacka.re through a shared link:
- **Storage Type**: `localStorage` (persistent)
- **Data Persistence**: Survives browser restarts
- **Privacy Level**: Balanced - data is encrypted and namespaced
- **Namespace**: Derived from the shared link content

**Example**: Opening `https://hacka.re/#gpt=encrypted_data_here`

## Understanding Namespaces

Namespaces are isolated containers for your data. Think of them as separate folders that keep different conversations and settings apart.

### For Session Storage Users

- **Single Namespace**: All data uses the `default_session` namespace
- **Complete Isolation**: Each browser session is completely separate
- **No History**: Previous conversations are not accessible after closing the tab
- **Use Case**: Perfect for sensitive conversations or when using shared computers

### For Local Storage Users

- **Dynamic Namespaces**: Each shared link creates its own namespace
- **Namespace ID**: First 8 characters of the hash of the encrypted link data
- **Persistent Access**: Return to the same conversation by using the same link
- **Multiple Contexts**: Different shared links maintain separate conversations

## Storage Type Locking

Once determined, the storage type is "locked" for your browser session to prevent data inconsistency:

1. **Initial Decision**: Made when you first load the page
2. **Session Lock**: Stored in `sessionStorage` as `__hacka_re_storage_type__`
3. **Consistent Behavior**: Remains the same even if you navigate between direct URLs and shared links
4. **New Decision**: Only changes when you start a fresh browser session

### Example Scenario

```
1. Open shared link → localStorage (locked)
2. Navigate to hacka.re homepage → still uses localStorage
3. Close browser completely
4. Open hacka.re directly → sessionStorage (new lock)
```

## Privacy Implications

### Session Storage Mode

**Pros:**
- ✅ Maximum privacy - no data persists
- ✅ Clean slate every session
- ✅ No tracking between sessions
- ✅ Ideal for public/shared computers

**Cons:**
- ❌ No conversation history
- ❌ Cannot bookmark conversations
- ❌ Settings reset each session
- ❌ No multi-tab synchronization

### Local Storage Mode

**Pros:**
- ✅ Conversation persistence
- ✅ Return to previous chats
- ✅ Settings preserved
- ✅ Multi-tab synchronization

**Cons:**
- ❌ Data persists until manually cleared
- ❌ Requires active data management
- ❌ Less suitable for shared computers

## Technical Details

### How Namespace IDs are Generated

**For Session Storage:**
```
Namespace = 'default_session'  // Always the same
```

**For Local Storage:**
```
1. Extract encrypted blob from URL hash
2. Calculate SHA-256 hash of the blob
3. Take first 8 characters as namespace ID
4. Example: 'a7b3c9d1'
```

### Data Organization

Each namespace stores:
- API keys (encrypted)
- Model selections
- Chat history
- System prompts
- UI preferences
- Custom functions

### Session Cleanup

**Session Storage**: Performs cleanup on initialization to ensure no encrypted data from previous sessions remains

**Local Storage**: No automatic cleanup - data persists for returning users

## Best Practices

### For Privacy-Conscious Users

1. **Use Direct URLs**: Always navigate directly to hacka.re
2. **Avoid Shared Links**: Don't use shared links unless necessary
3. **Private Browsing**: Use incognito/private mode for extra privacy
4. **Regular Cleanup**: If using shared links, manually clear data when done

### For Convenience Users

1. **Use Shared Links**: Create and bookmark shared links for persistent access
2. **Organize by Purpose**: Use different shared links for different projects
3. **Password Protection**: Always use strong session keys for shared links
4. **Periodic Cleanup**: Regularly review and clean old namespaces

## Switching Between Modes

To switch from one storage type to another:

1. **Close all hacka.re tabs**
2. **Start a new browser session** (or use a different browser)
3. **Access hacka.re** using your preferred method:
   - Direct URL for session storage
   - Shared link for local storage

## Troubleshooting

### "My conversations disappeared!"

- **If using session storage**: This is normal - data doesn't persist
- **If using local storage**: Make sure you're using the same shared link

### "Settings aren't saving"

- Check if you're in session storage mode (direct URL access)
- Switch to a shared link for persistent settings

### "Can't access shared data"

- Ensure you have the correct session key (password)
- Verify you're using the exact same shared link

## Security Notes

- All data is encrypted before storage
- Namespaces provide isolation between different contexts
- Session keys add an extra layer of security
- No data is ever sent to servers - everything stays in your browser

## Summary

hacka.re's namespace system provides flexibility:
- **Direct visits** → Temporary session storage for maximum privacy
- **Shared links** → Persistent local storage for conversation continuity

Choose the access method that best fits your privacy needs and use case.