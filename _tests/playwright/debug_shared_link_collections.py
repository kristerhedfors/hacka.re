#!/usr/bin/env python3
"""
Debug script to test shared link with function collections
"""

import time
import json
from playwright.sync_api import sync_playwright

def setup_console_logging(page):
    """Capture console messages"""
    console_messages = []
    
    def log_console(msg):
        timestamp = time.strftime("%H:%M:%S")
        message = f"[{timestamp}] {msg.type.upper()}: {msg.text}"
        console_messages.append(message)
        print(message)
    
    page.on("console", log_console)
    return console_messages

def test_shared_link_with_collections():
    """Test loading a shared link and verify function collections are preserved"""
    
    # The shared link URL with password 'asd'
    url = "file:///Users/user/dev/hacka.re/index.html#gpt=xxYz-5hACnvbyYf9D161HkGco8wPzZZA0qOS5TFoV_DGZXxvoBVe87nZ5KdrAzY8DYvXcWfLuLnI-LMWi-hHdFTf5OHovbS8_ka81UCvU2OCwy_UfcwY7cbFnk0UjcmZIaCIZvKiepXRG48Wpf7xiX6JBtdkqNQwLUzvN4wdv3BRDwd0fZ7k3IXUpaW_IFBBttZ18L91LfWkWlcDyRELo3MuH7HilnOv01cfSi7oSOwbgMNOPPgQr7gOWYQJ3M-ab_CoEjhsZ4M-FUnWDLU4isA4U8x7iTjQqsbEnT88R6-CPQLjlqTBQ6inJ3-bX-rbYSq4V0y0nH_iL2KluGT-yhu0PxPjUIbKkUW0upgsFN1xTRMGb-yDxVvIWO8Cwi3WXjT98eP848YNRZh1parL8XVZFfXZafi1ENB8MiA6Y8XfRh1mnjjw2RMAgC7D6GP1b77raO6ulIPsXEcN3VIeLJxyHLXudFHr7ZfMkE5OX8eBccn0G1N7Tw-d_2iy-SJEcN7KH3aEOFr7Ead29F_VGlRQ0V2Ej8REqjw3NgRAUdD0R8S21ROFRSLeBQeQbHG-rKRX4QPXxNf9VaEyRAm8xJiBe1iLpQ7uqgLfdN-QCkCe32a2SDdzT3Ms9BlRv9iQKcV41cjFpoyi2wbx4Nmft5pzmy2jwSCyG938HR1xoz7hHjkki-PqjOSmlSrW8L6Oh7-GHEIReKeCxmWB4v3PsBB-42Nhw4wgB-hN9tScFyPfXMtPaPFigmdq6bHvzlfPmRHeb0wNxS9munjTgsZalZKAm_Gw2wIXCXDf2xpCXdXfth7CcKkHiuebEWPLVfIx2OuwCjwvqFzzRJ7HvFwW-0XifoYf5F1mwt6QbbCV0wekokktfGxN0z_WHHxaUpcSOTIO7LV1xuxWSHJTIkV08homRZDHaqUcwTLQxxYgfK3aIoQ8oHu2pb85uKRDQr0nyGSxRZUSoYppah662leeHlpomDC9n5GEFpvkyl-ebzpM3lzOhi8AAXTy7XMnRnEFxfA2O1yXbWTOaGpJG8AEnbTdsZr90404X9d1678waUGl_SjSQzv_4quzzqHNDpzxhFklf2jnGZaebjzxtLTlVOZkRbr-ybut-1BDoMoBjhmWQzEuKdGBP8BGU8yRyUlZF4wwE0L5ZSCJRL_ZEzyLjVyJzRuIoESqrAh2qpEmZTrQyznNys2u5FV20vtwf9vglSu1f9s_uFO7VS-wLorUBVA2RygQITwuWgGIe6eCR3chHhdf8R4hzNUb7bd1E-ucAFcL7mk0TuL6SN5PHpho987CgqaJU5pqJRrV9lxNC2ENRE7cF-CTUWa4pxUHJEJ_tKNGCQ9uBBpNPh08pdDiGnE4NcKWzmnYPzjQ9eKFOzCkQ8YYPsJEnMM47t8yLusxZzsHD8YxdD6myoRu3z5L2Jt4TlDbnJoD-fvmOxCFelBBF_RmmEQLGNoxdlyW6WVn0kXRI0M6jmowy0SJUFAfIJVJLiYXF1WSMioGU6tCn6UNoYm6HdtzTxUF-AK2SJF8chCxYhtqs3D7Bsj50IEFc4tNDrQU4NYL1lp5j4citi6x5pUUXY2h9hWy27GfVCLgbdrQnVrSfiqvjzPOtCw2AZnF3qLRWLAvGPV_sY7I4gjxbBPoin5ZHwckPGHVbNK7ujg-tbVfrTF31OMCu9Cw3e3NlJ-etgNawnvlJO1lwVR6qWElSErmQ6Mq_MoY-HlDHe-8O2zrxQP265fA7YWA3t_F7Mu65mTAHJf_bj8n3_Xu13h2dvPUmIEY1JsvZSqQXSNof4ilbBP0AmOegFUnoz4q0IGccLTHeJVYuoz9xHpqzgCnUmk5qjRA7HvmZUYxFlbmUJPBJ3Dqne0nI-4HzLzdItx4PCAPYKatAgT5duOfyX4u0-prhvbFwO4t0dc-Z3rXyw7C7pOgInKthhrgjh4vQKHA-jjdb7u5RDZcXEieTKeNeLIVohXhwW_Pd3S9tgMlJUhRlZMYhdJBVU3v-15YvHqzhcNV_Yu8fgJp50xfCWIS9RmV5Op_OWOoY1eMoelCuHGzLgFTFNCPi8457UueiEI9RWCXQKJqbv_2Mgpp2gV83nSQxD-XBuF3WwCXyJDAyHFfBYzqr83t6G1uQDA2RHctY-oqNPLqp0KfHUyfyRlbn6YVmGedMQBZ1_ZVyPAC42uUvuLgzFG15ShcvICp05Qq34HCnnhUGR2drwlu_pZHRzPmqXyoCl5aKpHbv_voGsGkHDAU9cOXJfn4jc6PKJgmUh8sdaFLNZykI2OqLZnipXTOh7QZf5q2as8Nf0aIWmQUO3lyRyah8ilC9gLluFzAtOwyaG9c1HuxcdOJUat_mlolyrC5T4YnwuX4KcivpiPzwxOm9EZxdN-SBzr2H4ba-Xou3HIW0PZ3X_euB-ZYq3Cz7NjUG2S6T2nGCXW64HjnTj8nw36oxckUpyA2j71TKu56RbZ3djpejde2lLf628e3AIojnmwDOM9K16tUfTsJybRCQ4_CkSFu9ai640iZ"
    
    with sync_playwright() as p:
        # Launch browser in headed mode for debugging
        browser = p.chromium.launch(headless=False, slow_mo=100)
        context = browser.new_context()
        page = context.new_page()
        
        # Setup console logging
        console_messages = setup_console_logging(page)
        
        print("\n" + "="*80)
        print("TESTING SHARED LINK WITH FUNCTION COLLECTIONS")
        print("="*80)
        
        # Navigate to the shared link
        print(f"\n1. Navigating to shared link...")
        page.goto(url)
        
        # Wait for the shared link password modal
        print("\n2. Waiting for password modal...")
        page.wait_for_timeout(2000)  # Give the page time to create the modal
        
        # Find the password input specifically in the dynamically created modal
        print("\n3. Entering password 'asd'...")
        # The password modal is created dynamically with id="early-password-input"
        password_input = page.locator("#early-password-input")
        password_input.wait_for(state="visible", timeout=5000)
        password_input.fill("asd")
        
        # Click the decrypt button
        print("\n4. Clicking Decrypt button...")
        decrypt_button = page.locator("#early-password-submit")
        decrypt_button.click()
        
        # Wait for the modal to disappear
        print("\n5. Waiting for password verification...")
        page.wait_for_timeout(3000)
        print("   ✓ Password verified, modal closed")
        
        # Wait for the page to fully load and functions to be saved
        print("\n6. Waiting for page to initialize and functions to save...")
        page.wait_for_timeout(5000)  # Give more time for functions to be saved to localStorage
        
        # Check for function collections in console logs
        print("\n7. Checking console logs for function collection data...")
        
        collection_logs = [msg for msg in console_messages if "collection" in msg.lower() or "functions" in msg.lower()]
        if collection_logs:
            print("\n   Found collection-related console messages:")
            for log in collection_logs[-10:]:  # Show last 10 relevant logs
                print(f"   {log}")
        
        # Check localStorage for function collections
        print("\n8. Checking localStorage for function collections...")
        
        # First, let's see all localStorage keys to understand the structure
        all_keys = page.evaluate("() => Object.keys(localStorage)")
        print(f"   All localStorage keys: {all_keys}")
        
        # Look for keys containing 'function'
        function_keys = [key for key in all_keys if 'function' in key.lower()]
        print(f"   Function-related keys: {function_keys}")
        
        # Get function data from localStorage (try with and without namespace)
        # Try to get the namespace ID first
        namespace_id = page.evaluate("() => window.NamespaceService ? window.NamespaceService.getNamespaceId() : null")
        print(f"   Namespace ID: {namespace_id}")
        
        if namespace_id:
            js_functions_key = f"{namespace_id}_js_functions"
            function_collections_key = f"{namespace_id}_function_collections"
            function_collection_metadata_key = f"{namespace_id}_function_collection_metadata"
        else:
            js_functions_key = "js_functions"
            function_collections_key = "function_collections"
            function_collection_metadata_key = "function_collection_metadata"
        
        # The data is encrypted, so we need to use the storage service to get it
        js_functions = page.evaluate("""() => {
            if (window.FunctionToolsStorage) {
                const functions = window.FunctionToolsStorage.getJsFunctions();
                return JSON.stringify(functions);
            }
            return null;
        }""")
        
        function_collections = page.evaluate("""() => {
            if (window.FunctionToolsStorage) {
                const collections = window.FunctionToolsStorage.getFunctionCollections();
                return JSON.stringify(collections);
            }
            return null;
        }""")
        
        function_collection_metadata = page.evaluate("""() => {
            if (window.FunctionToolsStorage) {
                const metadata = window.FunctionToolsStorage.getFunctionCollectionMetadata();
                return JSON.stringify(metadata);
            }
            return null;
        }""")
        
        if js_functions:
            functions_obj = json.loads(js_functions)
            print(f"   ✓ Found {len(functions_obj)} functions in localStorage")
        else:
            print("   ✗ No functions found in localStorage")
        
        if function_collections:
            collections_obj = json.loads(function_collections)
            print(f"   ✓ Found function_collections data: {len(collections_obj)} mappings")
            # Show collection IDs
            unique_collections = set(collections_obj.values())
            print(f"   ✓ Unique collection IDs: {unique_collections}")
        else:
            print("   ✗ No function_collections found in localStorage")
        
        if function_collection_metadata:
            metadata_obj = json.loads(function_collection_metadata)
            print(f"   ✓ Found collection metadata for {len(metadata_obj)} collections")
            for cid, metadata in metadata_obj.items():
                print(f"      - {cid}: {metadata.get('name', 'unnamed')}")
        else:
            print("   ✗ No function_collection_metadata found in localStorage")
        
        # Open Function Calling modal to verify UI
        print("\n9. Opening Function Calling modal to check UI...")
        settings_button = page.locator("#settings-btn")
        settings_button.click()
        page.wait_for_timeout(500)
        
        # Use the function button ID instead of text selector
        function_calling_button = page.locator("#function-btn")
        function_calling_button.click()
        page.wait_for_timeout(1000)
        
        # Check if functions are grouped in collections in the UI
        function_list = page.locator("#function-list")
        if function_list.is_visible():
            # Check for collection headers or grouping
            collection_headers = page.locator(".function-collection-header").all()
            if collection_headers:
                print(f"   ✓ Found {len(collection_headers)} collection groups in UI")
            else:
                print("   ✗ No collection grouping found in UI")
                # Check if functions are just listed flat
                function_items = page.locator(".function-item").all()
                if function_items:
                    print(f"   ⚠ Functions are displayed flat (not grouped): {len(function_items)} functions")
        
        print("\n" + "="*80)
        print("TEST COMPLETE - Check console output above for details")
        print("="*80)
        
        # Keep browser open for manual inspection
        print("\nBrowser will stay open for 10 seconds for manual inspection...")
        page.wait_for_timeout(10000)
        
        browser.close()

if __name__ == "__main__":
    test_shared_link_with_collections()