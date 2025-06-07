"""
Pure Python testing using requests library
Tests all proxy types with direct HTTP requests
"""

import requests
import json
import time
from typing import Dict, Any
# Crypto utilities removed for simplification
from ..config import OPENAI_API_KEY, OPENAI_API_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TIMEOUT

def test_basic_chat_completion(proxy_url: str) -> bool:
    """Test basic chat completion without authentication"""
    payload = {
        "model": OPENAI_API_MODEL,
        "messages": [
            {"role": "user", "content": "Hello, this is a test message."}
        ],
        "max_tokens": DEFAULT_MAX_TOKENS
    }
    
    headers = {
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            f"{proxy_url}/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=5
        )
        
        print(f"Basic test - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data.get('choices', [{}])[0].get('message', {}).get('content', 'No content')[:100]}...")
            return True
        else:
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"Basic test failed: {e}")
        return False

# Authentication test functions removed for simplification

def test_streaming_response(proxy_url: str) -> bool:
    """Test streaming response"""
    payload = {
        "model": OPENAI_API_MODEL,
        "messages": [
            {"role": "user", "content": "Count from 1 to 5."}
        ],
        "max_tokens": DEFAULT_MAX_TOKENS,
        "stream": True
    }
    
    headers = {
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            f"{proxy_url}/v1/chat/completions",
            json=payload,
            headers=headers,
            stream=True,
            timeout=5
        )
        
        print(f"Streaming test - Status: {response.status_code}")
        if response.status_code == 200:
            chunks_received = 0
            for line in response.iter_lines():
                if line:
                    chunks_received += 1
                    if chunks_received >= 3:  # Just check we get some chunks
                        break
            
            print(f"Received {chunks_received} streaming chunks")
            return chunks_received > 0
        else:
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"Streaming test failed: {e}")
        return False

def run_tests(proxy_url: str) -> bool:
    """Run all pure Python tests"""
    print(f"\n=== Pure Python Tests for {proxy_url} ===")
    
    tests = [
        ("Basic Chat Completion", lambda: test_basic_chat_completion(proxy_url)),
        ("Streaming Response", lambda: test_streaming_response(proxy_url)),
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
    
    print(f"\n=== Pure Python Test Results ===")
    print(f"Passed: {success_count}/{total_count}")
    print(f"Success rate: {success_count/total_count*100:.1f}%")
    
    return success_count == total_count

if __name__ == '__main__':
    import sys
    proxy_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000'
    run_tests(proxy_url)
