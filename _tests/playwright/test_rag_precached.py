"""
Test RAG functionality with pre-generated embeddings for EU regulatory documents.
Tests the actual RAG system with AIA, CRA, and DORA documents.
"""

import pytest
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown, set_test_model_in_storage

def test_rag_with_aia_document(page: Page, serve_hacka_re, api_key):
    """Test RAG functionality with the pre-generated AIA (EU AI Act) embeddings."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key for OpenAI (required for query embeddings)
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    set_test_model_in_storage(page)
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Enable RAG
    rag_enabled_checkbox = page.locator("#rag-enabled-checkbox")
    if not rag_enabled_checkbox.is_checked():
        rag_enabled_checkbox.click()
    
    # Select AIA document
    aia_checkbox = page.locator("#rag-doc-aia")
    if not aia_checkbox.is_checked():
        aia_checkbox.click()
    
    # Uncheck other documents to test AIA specifically
    cra_checkbox = page.locator("#rag-doc-cra")
    if cra_checkbox.is_checked():
        cra_checkbox.click()
    
    dora_checkbox = page.locator("#rag-doc-dora")
    if dora_checkbox.is_checked():
        dora_checkbox.click()
    
    # Take screenshot of RAG configuration
    screenshot_with_markdown(page, "rag_aia_config", {
        "Status": "RAG configured for AIA document",
        "RAG Enabled": "Yes",
        "Document": "AIA (EU AI Act)",
        "API Key": "Configured"
    })
    
    # Close RAG modal
    close_button = page.locator("#close-rag-modal")
    close_button.click()
    
    # Send a chat message about AI Act
    chat_input = page.locator("#chat-input")
    send_button = page.locator("#send-btn")
    
    test_question = "What are the key requirements for high-risk AI systems in the EU AI Act?"
    chat_input.fill(test_question)
    
    # Capture API requests to verify RAG context is included
    rag_context_found = False
    
    def capture_api_request(route):
        nonlocal rag_context_found
        request_body = route.request.post_data
        if request_body:
            try:
                data = json.loads(request_body)
                if 'messages' in data:
                    for msg in data['messages']:
                        # Check if system message contains AIA content
                        if msg.get('role') == 'system':
                            content = msg.get('content', '')
                            if 'AI Act' in content or 'AIA' in content or 'high-risk' in content:
                                rag_context_found = True
                                break
            except:
                pass
        route.continue_()
    
    # Intercept API calls
    page.route("**/chat/completions", capture_api_request)
    
    # Send the message
    send_button.click()
    
    # Wait for response
    page.wait_for_selector(".message.assistant", timeout=30000)
    
    # Get the assistant response
    assistant_messages = page.locator(".message.assistant")
    assistant_response = assistant_messages.first.locator(".message-content").text_content()
    
    # Take screenshot of chat with RAG response
    screenshot_with_markdown(page, "rag_aia_response", {
        "Status": "RAG response received",
        "Question": test_question[:50] + "...",
        "Response Length": f"{len(assistant_response)} characters",
        "RAG Context Found": "Yes" if rag_context_found else "No"
    })
    
    # Verify the response is substantial and relevant
    assert len(assistant_response) > 100, "Response should be substantial"
    assert rag_context_found, "RAG context from AIA document should be included in API request"
    
    print(f"✓ RAG with AIA document working correctly")

def test_rag_search_functionality(page: Page, serve_hacka_re, api_key):
    """Test the RAG search functionality in the modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    set_test_model_in_storage(page)
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Enable RAG and select AIA document
    rag_enabled_checkbox = page.locator("#rag-enabled-checkbox")
    if not rag_enabled_checkbox.is_checked():
        rag_enabled_checkbox.click()
    
    aia_checkbox = page.locator("#rag-doc-aia")
    if not aia_checkbox.is_checked():
        aia_checkbox.click()
    
    # Perform a search
    search_input = page.locator("#rag-search-input")
    search_button = page.locator("#rag-search-btn")
    
    search_query = "transparency requirements"
    search_input.fill(search_query)
    search_button.click()
    
    # Wait for search results
    page.wait_for_selector("#rag-search-results", timeout=10000)
    
    # Check if results are displayed
    results_container = page.locator("#rag-search-results")
    results_text = results_container.text_content()
    
    # Take screenshot of search results
    screenshot_with_markdown(page, "rag_search_results", {
        "Status": "RAG search completed",
        "Query": search_query,
        "Results Found": "Yes" if results_text and len(results_text) > 10 else "No",
        "Document": "AIA"
    })
    
    # Verify search produced results
    assert results_text and len(results_text) > 10, "Search should return results from AIA document"
    
    # Clear search
    clear_button = page.locator("#rag-clear-search-btn")
    clear_button.click()
    
    # Verify search is cleared
    search_input_value = search_input.input_value()
    assert search_input_value == "", "Search input should be cleared"
    
    print(f"✓ RAG search functionality working correctly")

def test_rag_multi_document_selection(page: Page, serve_hacka_re, api_key):
    """Test RAG with multiple documents selected."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    set_test_model_in_storage(page)
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Enable RAG
    rag_enabled_checkbox = page.locator("#rag-enabled-checkbox")
    if not rag_enabled_checkbox.is_checked():
        rag_enabled_checkbox.click()
    
    # Select all three documents
    aia_checkbox = page.locator("#rag-doc-aia")
    if not aia_checkbox.is_checked():
        aia_checkbox.click()
    
    cra_checkbox = page.locator("#rag-doc-cra")
    if not cra_checkbox.is_checked():
        cra_checkbox.click()
    
    dora_checkbox = page.locator("#rag-doc-dora")
    if not dora_checkbox.is_checked():
        dora_checkbox.click()
    
    # Take screenshot of multi-document configuration
    screenshot_with_markdown(page, "rag_multi_document_config", {
        "Status": "RAG configured with multiple documents",
        "RAG Enabled": "Yes",
        "Documents": "AIA, CRA, DORA",
        "API Key": "Configured"
    })
    
    # Close RAG modal
    close_button = page.locator("#close-rag-modal")
    close_button.click()
    
    # Send a chat message that could relate to multiple acts
    chat_input = page.locator("#chat-input")
    send_button = page.locator("#send-btn")
    
    test_question = "What are the cybersecurity requirements across EU regulations?"
    chat_input.fill(test_question)
    
    # Capture API requests
    documents_referenced = []
    
    def capture_api_request(route):
        nonlocal documents_referenced
        request_body = route.request.post_data
        if request_body:
            try:
                data = json.loads(request_body)
                if 'messages' in data:
                    for msg in data['messages']:
                        if msg.get('role') == 'system':
                            content = msg.get('content', '')
                            if 'AI Act' in content or 'AIA' in content:
                                documents_referenced.append('AIA')
                            if 'Cyber Resilience Act' in content or 'CRA' in content:
                                documents_referenced.append('CRA')
                            if 'Digital Operational Resilience Act' in content or 'DORA' in content:
                                documents_referenced.append('DORA')
            except:
                pass
        route.continue_()
    
    # Intercept API calls
    page.route("**/chat/completions", capture_api_request)
    
    # Send the message
    send_button.click()
    
    # Wait for response
    page.wait_for_selector(".message.assistant", timeout=30000)
    
    # Get the assistant response
    assistant_messages = page.locator(".message.assistant")
    assistant_response = assistant_messages.first.locator(".message-content").text_content()
    
    # Take screenshot of multi-document response
    screenshot_with_markdown(page, "rag_multi_document_response", {
        "Status": "Multi-document RAG response received",
        "Question": test_question[:50] + "...",
        "Response Length": f"{len(assistant_response)} characters",
        "Documents Referenced": ", ".join(set(documents_referenced)) if documents_referenced else "None detected"
    })
    
    # Verify the response uses context from multiple documents
    assert len(assistant_response) > 100, "Response should be substantial"
    assert len(documents_referenced) > 0, "At least one document should be referenced"
    
    print(f"✓ RAG with multiple documents working correctly. Documents referenced: {set(documents_referenced)}")

def test_rag_disable_functionality(page: Page, serve_hacka_re, api_key):
    """Test that RAG can be properly disabled."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Configure API key
    page.evaluate(f"localStorage.setItem('openai_api_key', '{api_key}')")
    page.evaluate("localStorage.setItem('base_url', 'https://api.openai.com/v1')")
    set_test_model_in_storage(page)
    
    # Open RAG modal
    rag_button = page.locator("#rag-btn")
    rag_button.click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#rag-modal", state="visible", timeout=3000)
    
    # Disable RAG
    rag_enabled_checkbox = page.locator("#rag-enabled-checkbox")
    if rag_enabled_checkbox.is_checked():
        rag_enabled_checkbox.click()
    
    # Verify checkbox is unchecked
    expect(rag_enabled_checkbox).not_to_be_checked()
    
    # Take screenshot of disabled RAG
    screenshot_with_markdown(page, "rag_disabled_config", {
        "Status": "RAG disabled",
        "RAG Enabled": "No",
        "Documents": "N/A"
    })
    
    # Close RAG modal
    close_button = page.locator("#close-rag-modal")
    close_button.click()
    
    # Send a chat message
    chat_input = page.locator("#chat-input")
    send_button = page.locator("#send-btn")
    
    test_question = "What is the EU AI Act?"
    chat_input.fill(test_question)
    
    # Capture API requests to verify NO RAG context is included
    rag_context_found = False
    
    def capture_api_request(route):
        nonlocal rag_context_found
        request_body = route.request.post_data
        if request_body:
            try:
                data = json.loads(request_body)
                if 'messages' in data:
                    for msg in data['messages']:
                        if msg.get('role') == 'system':
                            content = msg.get('content', '')
                            # Check for document-specific content that would indicate RAG is active
                            if 'chunk_' in content or 'documentId' in content:
                                rag_context_found = True
                                break
            except:
                pass
        route.continue_()
    
    # Intercept API calls
    page.route("**/chat/completions", capture_api_request)
    
    # Send the message
    send_button.click()
    
    # Wait for response
    page.wait_for_selector(".message.assistant", timeout=30000)
    
    # Verify RAG was NOT used
    assert not rag_context_found, "RAG context should NOT be included when RAG is disabled"
    
    print(f"✓ RAG disable functionality working correctly")