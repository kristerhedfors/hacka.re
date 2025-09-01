"""
Test multi-query RAG search functionality with comprehensive debugging
"""

import pytest
import json
import time
from datetime import datetime
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, setup_api_key_properly, screenshot_with_markdown

# Enhanced console logging setup
def setup_enhanced_console_logging(page, test_name):
    """Setup comprehensive console logging with timestamps and categorization"""
    console_messages = []
    
    def log_console_message(msg):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        message_data = {
            'timestamp': timestamp,
            'type': msg.type,
            'text': msg.text,
            'location': str(msg.location) if msg.location else None,
            'args': []
        }
        
        # Try to get argument values
        try:
            for arg in msg.args:
                message_data['args'].append(arg.json_value())
        except:
            pass
        
        console_messages.append(message_data)
        
        # Print to pytest output for real-time visibility
        color_map = {
            'error': '\033[91m',  # Red
            'warning': '\033[93m',  # Yellow
            'info': '\033[94m',    # Blue
            'log': '\033[0m'       # Default
        }
        color = color_map.get(msg.type, '\033[0m')
        print(f"{color}[{timestamp}] {msg.type.upper()}: {msg.text}\033[0m")
        
        # Special handling for RAG-related messages
        if 'RAG' in msg.text or 'Vector' in msg.text or 'multi-query' in msg.text.lower():
            print(f"  🔍 RAG Debug: {msg.text}")
    
    page.on("console", log_console_message)
    page.on("pageerror", lambda err: print(f"❌ PAGE ERROR: {err}"))
    
    return console_messages


def save_debug_data(page, console_messages, test_name, step_name):
    """Save comprehensive debug data including console logs and page state"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Take screenshot with metadata
    screenshot_with_markdown(page, f"{test_name}_{step_name}", {
        "Test": test_name,
        "Step": step_name,
        "Timestamp": timestamp,
        "Console Messages": f"{len(console_messages)} messages captured",
        "URL": page.url
    })
    
    # Save console logs to JSON
    debug_file = f"debug_output/{test_name}_{step_name}_{timestamp}.json"
    debug_data = {
        "test": test_name,
        "step": step_name,
        "timestamp": timestamp,
        "console_messages": console_messages,
        "localStorage": page.evaluate("() => Object.entries(localStorage)"),
        "page_url": page.url,
        "page_title": page.title()
    }
    
    # Create debug directory if it doesn't exist
    import os
    os.makedirs("debug_output", exist_ok=True)
    
    with open(debug_file, 'w') as f:
        json.dump(debug_data, f, indent=2)
    
    print(f"📁 Debug data saved to: {debug_file}")
    
    # Also print key localStorage items for debugging
    try:
        rag_enabled = page.evaluate("() => localStorage.getItem('rag_enabled')")
        print(f"  RAG Enabled: {rag_enabled}")
        
        # Check for indexed documents
        eu_docs = page.evaluate("() => localStorage.getItem('rag_eu_documents_index')")
        if eu_docs:
            docs_data = json.loads(eu_docs)
            print(f"  Indexed EU Documents: {list(docs_data.keys()) if docs_data else 'None'}")
    except Exception as e:
        print(f"  Could not read localStorage: {e}")


@pytest.mark.asyncio
def test_rag_multi_query_search(page: Page, serve_hacka_re, api_key):
    """Test multi-query RAG search with EU AI Act content"""
    
    test_name = "test_rag_multi_query_search"
    print(f"\n{'='*60}")
    print(f"Starting test: {test_name}")
    print(f"{'='*60}\n")
    
    # Setup enhanced console logging
    console_messages = setup_enhanced_console_logging(page, test_name)
    
    # Navigate to the application
    print("📍 Step 1: Navigate to application")
    page.goto(serve_hacka_re)
    page.wait_for_load_state('networkidle')
    save_debug_data(page, console_messages, test_name, "01_initial_load")
    
    # Dismiss welcome modal
    print("📍 Step 2: Dismiss welcome modal")
    dismiss_welcome_modal(page)
    page.wait_for_timeout(500)
    
    # Setup API key
    print("📍 Step 3: Setup API key")
    setup_api_key_properly(page, api_key)
    page.wait_for_timeout(1000)
    save_debug_data(page, console_messages, test_name, "02_api_key_setup")
    
    # Open RAG modal
    print("📍 Step 4: Open RAG modal")
    rag_btn = page.locator("#rag-btn")
    expect(rag_btn).to_be_visible()
    rag_btn.click()
    page.wait_for_selector("#rag-modal.active", state="visible", timeout=5000)
    save_debug_data(page, console_messages, test_name, "03_rag_modal_open")
    
    # Expand Advanced section
    print("📍 Step 5: Expand Advanced section")
    advanced_toggle = page.locator("#rag-advanced-toggle").first
    if advanced_toggle.is_visible():
        # Check if it's already expanded
        advanced_content = page.locator("#rag-advanced-content")
        if not advanced_content.is_visible():
            advanced_toggle.click()
            page.wait_for_timeout(500)
    save_debug_data(page, console_messages, test_name, "04_advanced_expanded")
    
    # Verify multi-query settings are present
    print("📍 Step 6: Verify multi-query settings")
    multi_query_checkbox = page.locator("#rag-multi-query-enabled")
    expansion_model_select = page.locator("#rag-expansion-model")
    token_limit_input = page.locator("#rag-token-limit")
    
    expect(multi_query_checkbox).to_be_visible()
    expect(expansion_model_select).to_be_visible()
    expect(token_limit_input).to_be_visible()
    
    # Ensure multi-query is enabled
    if not multi_query_checkbox.is_checked():
        multi_query_checkbox.check()
    
    # Set token limit to a reasonable value for testing
    token_limit_input.fill("3000")
    
    # Select gpt-4o-mini for cost efficiency
    expansion_model_select.select_option("gpt-4o-mini")
    
    print(f"  ✓ Multi-query enabled: {multi_query_checkbox.is_checked()}")
    print(f"  ✓ Expansion model: {expansion_model_select.input_value()}")
    print(f"  ✓ Token limit: {token_limit_input.input_value()}")
    save_debug_data(page, console_messages, test_name, "05_multi_query_configured")
    
    # Index AIA document
    print("📍 Step 7: Index EU AI Act (AIA)")
    aia_checkbox = page.locator("#rag-doc-aia")
    
    # Check if already indexed
    aia_status = page.locator("#aia-status")
    status_text = aia_status.text_content()
    print(f"  Current AIA status: {status_text}")
    
    if "Not indexed" in status_text:
        print("  Indexing AIA document...")
        if not aia_checkbox.is_checked():
            aia_checkbox.check()
        
        # Wait for indexing to complete
        print("  Waiting for indexing to complete...")
        
        # Monitor console for indexing progress
        start_time = time.time()
        max_wait = 60  # 60 seconds max
        
        while time.time() - start_time < max_wait:
            current_status = aia_status.text_content()
            if "Indexed" in current_status and "Indexing" not in current_status:
                print(f"  ✓ AIA indexed successfully: {current_status}")
                break
            
            # Check for indexing messages in console
            recent_messages = [m for m in console_messages[-10:] if 'AIA' in m.get('text', '') or 'vector' in m.get('text', '').lower()]
            for msg in recent_messages:
                print(f"    Console: {msg['text']}")
            
            page.wait_for_timeout(1000)
        
        # Verify indexing completed
        final_status = aia_status.text_content()
        assert "Indexed" in final_status, f"AIA indexing failed. Status: {final_status}"
    else:
        print(f"  ✓ AIA already indexed: {status_text}")
    
    save_debug_data(page, console_messages, test_name, "06_aia_indexed")
    
    # Perform a search for AI Literacy
    print("📍 Step 8: Search for AI Literacy content")
    search_input = page.locator("#rag-search-input")
    search_btn = page.locator("#rag-search-btn")
    
    search_query = "AI literacy education requirements training"
    search_input.fill(search_query)
    print(f"  Search query: '{search_query}'")
    
    # Clear previous console messages to focus on search
    console_messages.clear()
    
    # Click search and wait for results
    search_btn.click()
    print("  Waiting for search results...")
    
    # Wait for search results to appear
    page.wait_for_selector("#rag-search-results", state="visible", timeout=10000)
    page.wait_for_timeout(2000)  # Allow time for multi-query expansion
    
    # Analyze console messages for multi-query behavior
    print("\n📊 Multi-Query Search Analysis:")
    expansion_messages = [m for m in console_messages if 'expand' in m.get('text', '').lower() or 'search term' in m.get('text', '').lower()]
    for msg in expansion_messages:
        print(f"  {msg['text']}")
    
    # Check search results
    search_results = page.locator("#rag-search-results")
    results_text = search_results.text_content()
    
    print(f"\n📊 Search Results Summary:")
    print(f"  Results visible: {search_results.is_visible()}")
    
    # Look for specific indicators in results
    if "No relevant results" in results_text:
        print("  ⚠️ No results found - checking why...")
        
        # Debug: Check if vectors are in memory
        vectors_info = page.evaluate("""() => {
            if (window.ragVectorStore) {
                const docIds = window.ragVectorStore.getDocumentIds();
                return {
                    hasVectorStore: true,
                    documentIds: docIds,
                    aiaVectors: window.ragVectorStore.hasVectors('aia')
                };
            }
            return { hasVectorStore: false };
        }""")
        print(f"  Vector Store Info: {json.dumps(vectors_info, indent=2)}")
    else:
        # Parse result count
        result_items = page.locator(".rag-result-item")
        result_count = result_items.count()
        print(f"  ✓ Found {result_count} result chunks")
        
        # Check for gap-filler chunks
        gap_fillers = page.locator(".rag-result-item.gap-filler")
        gap_filler_count = gap_fillers.count()
        print(f"  ✓ Gap-filler chunks: {gap_filler_count}")
        
        # Check for AI Literacy content
        ai_literacy_found = False
        for i in range(min(result_count, 5)):  # Check first 5 results
            result_content = result_items.nth(i).text_content()
            if "literacy" in result_content.lower() or "education" in result_content.lower():
                ai_literacy_found = True
                print(f"  ✓ Found relevant content in result {i+1}")
                print(f"    Preview: {result_content[:100]}...")
        
        assert ai_literacy_found or result_count > 0, "No relevant AI literacy content found in search results"
    
    save_debug_data(page, console_messages, test_name, "07_search_results")
    
    # Now test with actual chat to verify context inclusion
    print("\n📍 Step 9: Test context inclusion in chat")
    
    # Close RAG modal
    close_rag = page.locator("#close-rag-modal")
    close_rag.click()
    page.wait_for_timeout(500)
    
    # Enable RAG in settings if not already enabled
    settings_btn = page.locator("#settings-btn")
    settings_btn.click()
    page.wait_for_selector("#settings-modal.active", state="visible")
    
    # Find and check RAG checkbox in settings
    rag_enabled_checkbox = page.locator("#rag-enabled-checkbox")
    if rag_enabled_checkbox.is_visible() and not rag_enabled_checkbox.is_checked():
        rag_enabled_checkbox.check()
        print("  ✓ RAG enabled in settings")
    
    # Close settings
    close_settings = page.locator("#close-settings-modal")
    close_settings.click()
    page.wait_for_timeout(500)
    
    # Send a message asking about AI Literacy
    print("📍 Step 10: Send chat message about AI Literacy")
    chat_input = page.locator("#user-input")
    chat_input.fill("Based on the EU AI Act, what are the specific requirements for AI literacy? Please quote the exact text if available.")
    
    # Clear console for chat messages
    console_messages.clear()
    
    # Send message
    send_btn = page.locator("#send-message")
    send_btn.click()
    
    print("  Waiting for response...")
    
    # Wait for response to complete
    page.wait_for_selector(".message.assistant", state="visible", timeout=30000)
    page.wait_for_timeout(5000)  # Allow time for complete response
    
    # Check if RAG was used
    rag_messages = [m for m in console_messages if 'RAG' in m.get('text', '') or 'vector' in m.get('text', '').lower()]
    print(f"\n📊 RAG Usage in Chat:")
    for msg in rag_messages:
        print(f"  {msg['text']}")
    
    # Get the assistant's response
    assistant_messages = page.locator(".message.assistant")
    last_response = assistant_messages.last.text_content()
    
    print(f"\n📊 Assistant Response Analysis:")
    print(f"  Response length: {len(last_response)} characters")
    
    # Check for AI literacy content in response
    literacy_mentioned = "literacy" in last_response.lower()
    act_mentioned = "ai act" in last_response.lower() or "aia" in last_response.lower()
    
    print(f"  ✓ Mentions 'literacy': {literacy_mentioned}")
    print(f"  ✓ Mentions 'AI Act': {act_mentioned}")
    
    if literacy_mentioned:
        print("  ✓ SUCCESS: Response includes AI literacy information")
    else:
        print("  ⚠️ WARNING: Response may not include specific AI literacy content")
    
    save_debug_data(page, console_messages, test_name, "08_chat_response")
    
    # Final summary
    print(f"\n{'='*60}")
    print("Test Summary:")
    print(f"  Total console messages captured: {len(console_messages)}")
    print(f"  Multi-query search: {'Enabled' if multi_query_checkbox.is_checked() else 'Disabled'}")
    print(f"  Search performed: Yes")
    print(f"  Context included in chat: {'Yes' if literacy_mentioned else 'Uncertain'}")
    print(f"{'='*60}\n")
    
    # Save final debug summary
    save_debug_data(page, console_messages, test_name, "09_final_summary")


@pytest.mark.asyncio
def test_rag_multi_query_debug(page: Page, serve_hacka_re, api_key):
    """Debug test to trace multi-query expansion and ranking"""
    
    test_name = "test_rag_multi_query_debug"
    print(f"\n{'='*60}")
    print(f"Starting debug test: {test_name}")
    print(f"{'='*60}\n")
    
    # Setup enhanced console logging
    console_messages = setup_enhanced_console_logging(page, test_name)
    
    # Navigate and setup
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    setup_api_key_properly(page, api_key)
    
    # Execute JavaScript to directly test the query expansion
    print("📍 Testing Query Expansion Service directly")
    
    expansion_result = page.evaluate("""async () => {
        // Try both storage types with namespaced keys
        const apiKey = localStorage.getItem('openai_api_key') || 
                      sessionStorage.getItem('openai_api_key') ||
                      sessionStorage.getItem('hackare_default_session_api_key');
        const baseUrl = localStorage.getItem('base_url') || 
                       sessionStorage.getItem('base_url') ||
                       sessionStorage.getItem('hackare_default_session_base_url') ||
                       'https://api.openai.com/v1';
        
        // Debug: Log what we found
        console.log('Debug - API Key found:', !!apiKey);
        console.log('Debug - Base URL:', baseUrl);
        console.log('Debug - RAGQueryExpansionService exists:', !!window.RAGQueryExpansionService);
        
        if (!window.RAGQueryExpansionService) {
            return { error: 'RAGQueryExpansionService not found' };
        }
        
        if (!apiKey) {
            return { 
                error: 'API key not found in storage',
                localStorage_keys: Object.keys(localStorage),
                sessionStorage_keys: Object.keys(sessionStorage)
            };
        }
        
        try {
            const query = 'What are the AI literacy requirements in the EU AI Act?';
            const searchTerms = await window.RAGQueryExpansionService.expandQuery(
                query,
                'gpt-4o-mini',
                apiKey,
                baseUrl
            );
            
            return {
                success: true,
                query: query,
                searchTerms: searchTerms,
                termCount: searchTerms.length
            };
        } catch (error) {
            return {
                error: error.message,
                stack: error.stack
            };
        }
    }""")
    
    print(f"  Expansion Result: {json.dumps(expansion_result, indent=2)}")
    
    # Test embedding generation
    print("\n📍 Testing Embedding Generation")
    
    if expansion_result.get('success'):
        embedding_result = page.evaluate("""async (searchTerms) => {
            const apiKey = localStorage.getItem('openai_api_key');
            const baseUrl = localStorage.getItem('base_url') || 'https://api.openai.com/v1';
            
            try {
                const embeddings = await window.RAGQueryExpansionService.generateMultipleEmbeddings(
                    searchTerms,
                    apiKey,
                    baseUrl,
                    'text-embedding-3-small'
                );
                
                return {
                    success: true,
                    embeddingCount: embeddings.length,
                    terms: embeddings.map(e => e.term),
                    firstEmbeddingDims: embeddings[0]?.embedding?.length
                };
            } catch (error) {
                return {
                    error: error.message
                };
            }
        }""", expansion_result.get('searchTerms', []))
        
        print(f"  Embedding Result: {json.dumps(embedding_result, indent=2)}")
    
    # Check cache statistics
    print("\n📍 Checking Cache Statistics")
    
    cache_stats = page.evaluate("""() => {
        if (window.RAGQueryExpansionService) {
            return window.RAGQueryExpansionService.getCacheStats();
        }
        return null;
    }""")
    
    print(f"  Cache Stats: {json.dumps(cache_stats, indent=2)}")
    
    save_debug_data(page, console_messages, test_name, "debug_complete")
    
    print(f"\n{'='*60}")
    print("Debug test complete")
    print(f"{'='*60}\n")