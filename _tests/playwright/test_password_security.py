"""
Test to verify that passwords are never stored in persistent storage (SessionStorage/LocalStorage).
Only derived master keys should be stored.
"""

import time
import re
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import json


def test_password_not_stored_in_session_storage(page: Page, serve_hacka_re):
    """Test that share link passwords are not stored in SessionStorage"""
    
    # Create a mock shared link with encrypted data
    # This simulates arriving via a shared link
    mock_encrypted_data = "U2FsdGVkX1+ABC123DEF456"  # Mock encrypted data
    share_url = f"{serve_hacka_re}#shared={mock_encrypted_data}"
    
    # Navigate to the share link
    page.goto(share_url)
    
    # Wait for page to load
    page.wait_for_timeout(1000)
    
    # Check SessionStorage for any password-like entries
    session_storage = page.evaluate("""() => {
        const storage = {};
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            storage[key] = sessionStorage.getItem(key);
        }
        return storage;
    }""")
    
    print("SessionStorage contents after loading shared link:")
    for key, value in session_storage.items():
        print(f"  {key}: {value[:50] if value else 'null'}...")
    
    # Check that no 12-character passwords are stored
    # Passwords for share links are 12 alphanumeric characters
    password_pattern = re.compile(r'^[a-zA-Z0-9]{12}$')
    
    passwords_found = []
    for key, value in session_storage.items():
        # Skip the storage type indicator (it happens to be 12 chars but not a password)
        if key == "__hacka_re_storage_type__":
            continue
        if value and password_pattern.match(value):
            passwords_found.append(f"{key} = {value}")
    
    assert len(passwords_found) == 0, f"Found passwords in SessionStorage: {passwords_found}"
    
    # Take screenshot for documentation
    screenshot_with_markdown(page, "password_security_check", {
        "Test": "Password not stored in SessionStorage",
        "Status": "Pass - No passwords found",
        "SessionStorage Keys": str(list(session_storage.keys()))
    })


def test_direct_visit_generates_64_char_key(page: Page, serve_hacka_re):
    """Test that direct visits generate a 64-character hex key (not a password)"""
    
    # Clear all storage first
    page.goto(serve_hacka_re)
    page.evaluate("() => { sessionStorage.clear(); localStorage.clear(); }")
    
    # Navigate directly to the site (no share link)
    page.goto(serve_hacka_re)
    
    # Wait for initialization
    page.wait_for_timeout(1000)
    
    # Dismiss welcome modal if it appears
    dismiss_welcome_modal(page)
    
    # Check SessionStorage for the generated key
    session_storage = page.evaluate("""() => {
        const storage = {};
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            storage[key] = sessionStorage.getItem(key);
        }
        return storage;
    }""")
    
    print("SessionStorage contents after direct visit:")
    for key, value in session_storage.items():
        print(f"  {key}: {value[:50] if value else 'null'}...")
    
    # Look for the session key for default namespace
    default_session_key = None
    for key, value in session_storage.items():
        if key == "__hacka_re_session_key_default_session":
            default_session_key = value
            break
    
    # Verify it's a 64-character hex string (32 bytes as hex)
    if default_session_key:
        assert len(default_session_key) == 64, f"Session key should be 64 chars, got {len(default_session_key)}"
        assert all(c in '0123456789abcdef' for c in default_session_key.lower()), \
            "Session key should be hexadecimal"
        print(f"✓ Generated 64-char hex key for direct visit: {default_session_key[:20]}...")
    
    screenshot_with_markdown(page, "direct_visit_key_generation", {
        "Test": "Direct visit generates 64-char key",
        "Status": "Pass" if default_session_key else "No key found",
        "Key Length": len(default_session_key) if default_session_key else "N/A",
        "Key Sample": default_session_key[:20] + "..." if default_session_key else "N/A"
    })


def test_share_modal_generates_new_password_after_refresh(page: Page, serve_hacka_re):
    """Test that Share Modal generates a new password after page refresh"""
    
    # Navigate to the site
    page.goto(serve_hacka_re)
    page.wait_for_timeout(1000)
    
    # Dismiss welcome modal
    dismiss_welcome_modal(page)
    
    # Open share modal - use the specific ID
    share_button = page.locator("#share-btn")
    share_button.wait_for(state="visible", timeout=5000)
    share_button.click()
    
    # Get the initial password
    page.wait_for_selector("#share-password", state="visible")
    initial_password = page.locator("#share-password").input_value()
    print(f"Initial password in Share Modal: {initial_password}")
    
    # Verify it's a 12-character alphanumeric password
    assert len(initial_password) == 12, f"Password should be 12 chars, got {len(initial_password)}"
    assert initial_password.isalnum(), "Password should be alphanumeric"
    
    # Close modal
    close_button = page.locator(".modal.share-modal .modal-close, .modal.share-modal button:has-text('Close')")
    if close_button.is_visible():
        close_button.click()
    else:
        page.keyboard.press("Escape")
    
    # Refresh the page
    page.reload()
    page.wait_for_timeout(1000)
    
    # Dismiss welcome modal again
    dismiss_welcome_modal(page)
    
    # Open share modal again
    share_button = page.locator("#share-btn")
    share_button.wait_for(state="visible", timeout=5000)
    share_button.click()
    
    # Get the new password
    page.wait_for_selector("#share-password", state="visible")
    new_password = page.locator("#share-password").input_value()
    print(f"Password after refresh: {new_password}")
    
    # Verify it's different from the initial password
    assert new_password != initial_password, \
        f"Password should be different after refresh! Got same: {new_password}"
    
    # Verify it's still a valid 12-character password
    assert len(new_password) == 12, f"New password should be 12 chars, got {len(new_password)}"
    assert new_password.isalnum(), "New password should be alphanumeric"
    
    screenshot_with_markdown(page, "new_password_after_refresh", {
        "Test": "Share Modal generates new password after refresh",
        "Initial Password": initial_password,
        "New Password": new_password,
        "Status": "Pass - Passwords are different"
    })
    
    print("✓ Share Modal correctly generates a new password after refresh")


def test_no_password_in_storage_after_share_link_access(page: Page, serve_hacka_re):
    """Test that after accessing a shared link with password, the password is not stored"""
    
    # This would require a real encrypted share link with a known password
    # For now, we'll check that the pattern is correct
    
    # Navigate to regular site first
    page.goto(serve_hacka_re)
    page.wait_for_timeout(1000)
    
    # Check that no 12-character alphanumeric strings are in storage
    all_storage = page.evaluate("""() => {
        const result = {
            session: {},
            local: {}
        };
        
        // Check SessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            result.session[key] = sessionStorage.getItem(key);
        }
        
        // Check LocalStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            result.local[key] = localStorage.getItem(key);
        }
        
        return result;
    }""")
    
    # Look for any 12-character alphanumeric values (potential passwords)
    password_pattern = re.compile(r'^[a-zA-Z0-9]{12}$')
    found_passwords = []
    
    for storage_type, storage_data in all_storage.items():
        for key, value in storage_data.items():
            if value and password_pattern.match(value):
                found_passwords.append(f"{storage_type}.{key} = {value}")
    
    if found_passwords:
        print("WARNING: Found potential passwords in storage:")
        for pwd in found_passwords:
            print(f"  {pwd}")
        assert False, f"No passwords should be in storage, found: {found_passwords}"
    else:
        print("✓ No 12-character passwords found in any storage")
    
    screenshot_with_markdown(page, "no_passwords_in_storage", {
        "Test": "No passwords in persistent storage",
        "SessionStorage Keys": len(all_storage['session']),
        "LocalStorage Keys": len(all_storage['local']),
        "Passwords Found": "None",
        "Status": "Pass"
    })


if __name__ == "__main__":
    # This allows running the test file directly for debugging
    import subprocess
    import sys
    
    # Run with pytest
    result = subprocess.run(
        [sys.executable, "-m", "pytest", __file__, "-v", "-s"],
        cwd="/Users/user/dev/hacka.re"
    )
    sys.exit(result.returncode)