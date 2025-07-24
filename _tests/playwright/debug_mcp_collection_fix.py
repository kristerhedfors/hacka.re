#!/usr/bin/env python3

"""
Debug script to test MCP function collection fixes
"""

import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_mcp_collection_fix(page: Page, serve_hacka_re, api_key):
    """Test that MCP functions are properly organized in server-specific collections"""
    
    print("=== TESTING MCP FUNCTION COLLECTION FIX ===")
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set API key
    page.click("#api-key-btn")
    page.fill("#api-key-input", api_key)
    page.click("#api-key-save")
    page.wait_for_timeout(1000)
    
    # Open MCP modal
    page.click("#mcp-servers-btn")
    page.wait_for_selector("#mcp-servers-modal", state="visible")
    
    # Set up GitHub MCP with a test token
    page.click("#connect-github")
    page.wait_for_selector("#service-pat-modal", state="visible")
    
    # Enter test token
    pat_input = page.locator('#github-pat-input')
    test_token = "ghp_123456789012345678901234567890123456781234"
    pat_input.fill(test_token)
    
    # Verify token was entered
    entered_value = pat_input.input_value()
    print(f"✅ Token entered: {entered_value[:10]}...{entered_value[-4:]}")
    
    # Connect (this will fail with 401 but that's expected)
    page.click("#github-pat-connect")
    page.wait_for_timeout(2000)
    
    # Close the PAT modal
    try:
        page.click("#close-github-pat-modal")
    except:
        # Try JavaScript if click fails
        page.evaluate("""
            const modal = document.getElementById('service-pat-modal');
            if (modal) modal.remove();
        """)
    
    page.wait_for_timeout(1000)
    
    # Close MCP modal
    page.click("#close-mcp-servers-modal")
    page.wait_for_timeout(1000)
    
    # Open function modal to check collections
    page.click("#function-btn")
    page.wait_for_selector("#function-modal", state="visible")
    
    # Take screenshot and check function collections
    screenshot_with_markdown(page, "function_collections", {
        "Status": "Checking MCP function collections",
        "Expected": "Should see MCP Tools (github) collection, not multiple duplicates"
    })
    
    # Get function collection data from the page
    collection_info = page.evaluate("""
        () => {
            const collections = {};
            const collectionHeaders = document.querySelectorAll('.function-collection-header h4');
            
            collectionHeaders.forEach(header => {
                const collectionName = header.textContent;
                const countElement = header.parentElement.querySelector('.function-collection-count');
                const count = countElement ? countElement.textContent : '';
                
                if (collectionName.includes('MCP')) {
                    collections[collectionName] = count;
                }
            });
            
            return {
                collections: collections,
                totalMCPCollections: Object.keys(collections).length
            };
        }
    """)
    
    print(f"MCP Collections found: {collection_info}")
    
    # Check if we have the expected single GitHub collection
    expected_collection_name = "MCP Tools (github)"
    if expected_collection_name in collection_info['collections']:
        print(f"✅ Found expected collection: {expected_collection_name}")
        print(f"   Function count: {collection_info['collections'][expected_collection_name]}")
    else:
        print("❌ Expected GitHub MCP collection not found")
        print(f"   Found collections: {list(collection_info['collections'].keys())}")
    
    # Check for duplicate collections
    if collection_info['totalMCPCollections'] > 1:
        print(f"⚠️  Multiple MCP collections found ({collection_info['totalMCPCollections']})")
        for name, count in collection_info['collections'].items():
            print(f"   - {name}: {count}")
    else:
        print("✅ Single MCP collection as expected")
    
    # Test removing and re-adding the connection to check for duplication
    print("\n=== TESTING RE-CONNECTION ===")
    
    # Close function modal
    page.click("#close-function-modal")
    page.wait_for_timeout(500)
    
    # Re-open MCP modal to disconnect and reconnect
    page.click("#mcp-servers-btn")
    page.wait_for_timeout(1000)
    
    # Try to disconnect (if connected)
    disconnect_btn = page.locator("button:has-text('Disconnect'):visible")
    if disconnect_btn.count() > 0:
        print("Found disconnect button, clicking it")
        disconnect_btn.first.click()
        page.wait_for_timeout(1000)
    
    # Reconnect
    page.click("#connect-github")
    page.wait_for_selector("#service-pat-modal", state="visible")
    
    # Enter token again
    pat_input = page.locator('#github-pat-input')
    pat_input.fill(test_token)
    page.click("#github-pat-connect")
    page.wait_for_timeout(2000)
    
    # Close PAT modal
    try:
        page.click("#close-github-pat-modal")
    except:
        page.evaluate("""
            const modal = document.getElementById('service-pat-modal');
            if (modal) modal.remove();
        """)
    
    page.wait_for_timeout(1000)
    
    # Close MCP modal
    page.click("#close-mcp-servers-modal")
    page.wait_for_timeout(1000)
    
    # Check collections again
    page.click("#function-btn")
    page.wait_for_selector("#function-modal", state="visible")
    
    # Get updated collection data
    collection_info_after = page.evaluate("""
        () => {
            const collections = {};
            const collectionHeaders = document.querySelectorAll('.function-collection-header h4');
            
            collectionHeaders.forEach(header => {
                const collectionName = header.textContent;
                const countElement = header.parentElement.querySelector('.function-collection-count');
                const count = countElement ? countElement.textContent : '';
                
                if (collectionName.includes('MCP')) {
                    collections[collectionName] = count;
                }
            });
            
            return {
                collections: collections,
                totalMCPCollections: Object.keys(collections).length
            };
        }
    """)
    
    print(f"MCP Collections after reconnection: {collection_info_after}")
    
    # Final screenshot
    screenshot_with_markdown(page, "function_collections_after_reconnection", {
        "Status": "After reconnection test",
        "Before": f"{collection_info['totalMCPCollections']} collections",
        "After": f"{collection_info_after['totalMCPCollections']} collections",
        "Success": "Single collection maintained" if collection_info_after['totalMCPCollections'] <= 1 else "Multiple collections created"
    })
    
    # Close function modal
    page.click("#close-function-modal")
    
    return {
        'initial_collections': collection_info,
        'final_collections': collection_info_after,
        'test_passed': collection_info_after['totalMCPCollections'] <= 1
    }

if __name__ == "__main__":
    print("This is a debug script for MCP function collection fixes.")