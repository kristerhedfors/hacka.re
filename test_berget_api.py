#!/usr/bin/env python3
"""
Test Berget AI API directly to verify model functionality
"""
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('_tests/playwright/.env')

# Get Berget API key
BERGET_API_KEY = os.getenv('BERGET_API_KEY')
if not BERGET_API_KEY:
    print("ERROR: BERGET_API_KEY not found in environment")
    exit(1)

print(f"Using Berget API key: {BERGET_API_KEY[:10]}...{BERGET_API_KEY[-4:]}")

# API configuration
API_URL = "https://api.berget.ai/v1/chat/completions"
MODEL = "openai/gpt-oss-120b"

# Test message
messages = [
    {
        "role": "user",
        "content": "Hello, please respond with just 'Hi!' and nothing else."
    }
]

# Make non-streaming request first
print(f"\n1. Testing non-streaming request to {MODEL}...")
print("-" * 50)

headers = {
    "Authorization": f"Bearer {BERGET_API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "model": MODEL,
    "messages": messages,
    "stream": False,
    "temperature": 0.7,
    "max_tokens": 100
}

try:
    response = requests.post(API_URL, headers=headers, json=data, timeout=30)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Response JSON: {json.dumps(result, indent=2)}")
        
        if 'choices' in result and len(result['choices']) > 0:
            content = result['choices'][0].get('message', {}).get('content', '')
            print(f"\n✅ Assistant response: '{content}'")
        else:
            print("❌ No choices in response")
    else:
        print(f"❌ Error response: {response.text}")
        
except Exception as e:
    print(f"❌ Request failed: {e}")

# Test streaming request
print(f"\n2. Testing streaming request to {MODEL}...")
print("-" * 50)

data['stream'] = True

try:
    response = requests.post(API_URL, headers=headers, json=data, stream=True, timeout=30)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("Streaming response chunks:")
        full_response = ""
        chunk_count = 0
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    chunk_data = line_str[6:]  # Remove 'data: ' prefix
                    
                    if chunk_data == '[DONE]':
                        print(f"  Stream completed after {chunk_count} chunks")
                        break
                    
                    try:
                        chunk_json = json.loads(chunk_data)
                        chunk_count += 1
                        
                        # Extract content from chunk
                        if 'choices' in chunk_json and len(chunk_json['choices']) > 0:
                            delta = chunk_json['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                full_response += content
                                print(f"  Chunk {chunk_count}: '{content}'")
                    except json.JSONDecodeError as e:
                        print(f"  Failed to parse chunk: {chunk_data[:100]}")
        
        print(f"\n✅ Full streaming response: '{full_response}'")
    else:
        print(f"❌ Error response: {response.text}")
        
except Exception as e:
    print(f"❌ Request failed: {e}")

# Test with a different model for comparison
print(f"\n3. Testing with mistralai/Devstral-Small-2505 for comparison...")
print("-" * 50)

data['model'] = "mistralai/Devstral-Small-2505"
data['stream'] = False

try:
    response = requests.post(API_URL, headers=headers, json=data, timeout=30)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        if 'choices' in result and len(result['choices']) > 0:
            content = result['choices'][0].get('message', {}).get('content', '')
            print(f"✅ Devstral response: '{content}'")
        else:
            print("❌ No choices in response")
    else:
        print(f"❌ Error response: {response.text}")
        
except Exception as e:
    print(f"❌ Request failed: {e}")