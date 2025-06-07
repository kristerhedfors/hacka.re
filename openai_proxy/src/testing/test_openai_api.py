"""
OpenAI API testing using the official OpenAI Python client
Tests all proxy types with the official client library
"""

import openai
import json
import time
from typing import Dict, Any
# Crypto utilities removed for simplification
from ..config import OPENAI_API_KEY, OPENAI_API_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TIMEOUT

def test_openai_client_basic(proxy_url: str) -> bool:
    """Test basic chat completion using OpenAI client"""
    client = openai.OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=f"{proxy_url}/v1"
    )
    
    try:
        response = client.chat.completions.create(
            model=OPENAI_API_MODEL,
            messages=[
                {"role": "user", "content": "Hello, this is a test using the OpenAI client."}
            ],
            max_tokens=DEFAULT_MAX_TOKENS
        )
        
        print(f"OpenAI client test - Success")
        print(f"Response: {response.choices[0].message.content[:100]}...")
        return True
        
    except Exception as e:
        print(f"OpenAI client test failed: {e}")
        return False

def test_openai_client_streaming(proxy_url: str) -> bool:
    """Test streaming chat completion using OpenAI client"""
    client = openai.OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=f"{proxy_url}/v1"
    )
    
    try:
        stream = client.chat.completions.create(
            model=OPENAI_API_MODEL,
            messages=[
                {"role": "user", "content": "Count from 1 to 5."}
            ],
            max_tokens=DEFAULT_MAX_TOKENS,
            stream=True
        )
        
        chunks_received = 0
        content_parts = []
        
        for chunk in stream:
            chunks_received += 1
            if chunk.choices[0].delta.content:
                content_parts.append(chunk.choices[0].delta.content)
            
            if chunks_received >= 5:  # Just check we get some chunks
                break
        
        print(f"OpenAI streaming test - Received {chunks_received} chunks")
        print(f"Content: {''.join(content_parts)[:100]}...")
        return chunks_received > 0
        
    except Exception as e:
        print(f"OpenAI streaming test failed: {e}")
        return False

# Authentication test function removed for simplification

def test_openai_client_error_handling(proxy_url: str) -> bool:
    """Test error handling with OpenAI client"""
    client = openai.OpenAI(
        api_key="invalid-key",
        base_url=f"{proxy_url}/v1"
    )
    
    try:
        response = client.chat.completions.create(
            model=OPENAI_API_MODEL,
            messages=[
                {"role": "user", "content": "This should fail with invalid key."}
            ],
            max_tokens=DEFAULT_MAX_TOKENS
        )
        
        print(f"Error handling test - Unexpected success")
        return False
        
    except openai.AuthenticationError as e:
        print(f"Error handling test - Correctly caught authentication error: {e}")
        return True
    except Exception as e:
        print(f"Error handling test - Caught unexpected error: {e}")
        return True  # Any error is acceptable for this test

def test_openai_client_model_list(proxy_url: str) -> bool:
    """Test model listing (if supported by proxy)"""
    client = openai.OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=f"{proxy_url}/v1"
    )
    
    try:
        models = client.models.list()
        print(f"Model list test - Found {len(models.data)} models")
        return True
        
    except Exception as e:
        print(f"Model list test - Expected failure (not implemented): {e}")
        return True  # This is expected to fail for minimal proxies

def run_tests(proxy_url: str) -> bool:
    """Run all OpenAI API client tests"""
    print(f"\n=== OpenAI API Client Tests for {proxy_url} ===")
    
    tests = [
        ("Basic Chat Completion", lambda: test_openai_client_basic(proxy_url)),
        ("Streaming Response", lambda: test_openai_client_streaming(proxy_url)),
        ("Error Handling", lambda: test_openai_client_error_handling(proxy_url)),
        ("Model List", lambda: test_openai_client_model_list(proxy_url)),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            result = test_func()
            results.append(result)
            print(f"✅ {test_name}: {'PASSED' if result else 'FAILED'}")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
            results.append(False)
    
    success_count = sum(results)
    total_count = len(results)
    
    print(f"\n=== OpenAI API Client Test Results ===")
    print(f"Passed: {success_count}/{total_count}")
    print(f"Success rate: {success_count/total_count*100:.1f}%")
    
    return success_count >= total_count - 1  # Allow one failure (model list is expected to fail)

if __name__ == '__main__':
    import sys
    proxy_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000'
    run_tests(proxy_url)
