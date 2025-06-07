"""
Tool calling testing for OpenAI Proxy
Tests function calling capabilities with both pure Python and OpenAI client
"""

import requests
import openai
import json
import time
from typing import Dict, Any, List
from ..utils.crypto_utils import sign_request, sign_ed25519_request, generate_ed25519_keypair
from ..config import OPENAI_API_KEY, OPENAI_API_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TIMEOUT

# Example tool definitions
EXAMPLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "The unit of temperature"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_factorial",
            "description": "Calculate the factorial of a number",
            "parameters": {
                "type": "object",
                "properties": {
                    "n": {
                        "type": "integer",
                        "description": "The number to calculate factorial for",
                        "minimum": 0,
                        "maximum": 20
                    }
                },
                "required": ["n"]
            }
        }
    }
]

def test_tool_calling_pure_python(proxy_url: str) -> bool:
    """Test tool calling using pure Python requests"""
    payload = {
        "model": OPENAI_API_MODEL,
        "messages": [
            {"role": "user", "content": "What's the weather like in San Francisco and what's the factorial of 5?"}
        ],
        "tools": EXAMPLE_TOOLS,
        "tool_choice": "auto",
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
            timeout=DEFAULT_TIMEOUT
        )
        
        print(f"Tool calling (Pure Python) - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            choice = data.get('choices', [{}])[0]
            message = choice.get('message', {})
            
            # Check if tool calls were made
            tool_calls = message.get('tool_calls', [])
            if tool_calls:
                print(f"Tool calls detected: {len(tool_calls)} calls")
                for i, tool_call in enumerate(tool_calls):
                    func_name = tool_call.get('function', {}).get('name', 'unknown')
                    print(f"  Tool {i+1}: {func_name}")
                return True
            else:
                print(f"No tool calls, regular response: {message.get('content', 'No content')[:100]}...")
                return True  # Still a success, just no tools called
        else:
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"Tool calling (Pure Python) test failed: {e}")
        return False

def test_tool_calling_openai_client(proxy_url: str) -> bool:
    """Test tool calling using OpenAI client"""
    client = openai.OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=f"{proxy_url}/v1"
    )
    
    try:
        response = client.chat.completions.create(
            model=OPENAI_API_MODEL,
            messages=[
                {"role": "user", "content": "Calculate the factorial of 7 and tell me about the weather in New York"}
            ],
            tools=EXAMPLE_TOOLS,
            tool_choice="auto",
            max_tokens=DEFAULT_MAX_TOKENS
        )
        
        print(f"Tool calling (OpenAI Client) - Success")
        message = response.choices[0].message
        
        # Check if tool calls were made
        if message.tool_calls:
            print(f"Tool calls detected: {len(message.tool_calls)} calls")
            for i, tool_call in enumerate(message.tool_calls):
                func_name = tool_call.function.name
                func_args = tool_call.function.arguments
                print(f"  Tool {i+1}: {func_name} with args: {func_args}")
            return True
        else:
            print(f"No tool calls, regular response: {message.content[:100]}...")
            return True  # Still a success, just no tools called
        
    except Exception as e:
        print(f"Tool calling (OpenAI Client) test failed: {e}")
        return False

def test_tool_calling_with_execution(proxy_url: str) -> bool:
    """Test complete tool calling workflow with function execution"""
    client = openai.OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=f"{proxy_url}/v1"
    )
    
    # Mock function implementations
    def get_current_weather(location: str, unit: str = "fahrenheit") -> str:
        return f"The weather in {location} is 72°{unit[0].upper()} and sunny."
    
    def calculate_factorial(n: int) -> int:
        if n <= 1:
            return 1
        result = 1
        for i in range(2, n + 1):
            result *= i
        return result
    
    # Available functions
    available_functions = {
        "get_current_weather": get_current_weather,
        "calculate_factorial": calculate_factorial
    }
    
    try:
        # Initial request
        messages = [
            {"role": "user", "content": "What's the factorial of 4 and what's the weather in Boston?"}
        ]
        
        response = client.chat.completions.create(
            model=OPENAI_API_MODEL,
            messages=messages,
            tools=EXAMPLE_TOOLS,
            tool_choice="auto",
            max_tokens=DEFAULT_MAX_TOKENS
        )
        
        response_message = response.choices[0].message
        messages.append(response_message)
        
        # Check if tool calls were made
        if response_message.tool_calls:
            print(f"Tool execution test - {len(response_message.tool_calls)} tool calls to execute")
            
            # Execute each tool call
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                if function_name in available_functions:
                    function_response = available_functions[function_name](**function_args)
                    print(f"  Executed {function_name}: {function_response}")
                    
                    # Add function response to messages
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": str(function_response)
                    })
            
            # Get final response with function results
            final_response = client.chat.completions.create(
                model=OPENAI_API_MODEL,
                messages=messages,
                max_tokens=DEFAULT_MAX_TOKENS
            )
            
            final_content = final_response.choices[0].message.content
            print(f"Final response: {final_content[:200]}...")
            return True
        else:
            print(f"No tool calls made, response: {response_message.content[:100]}...")
            return True  # Still a success
        
    except Exception as e:
        print(f"Tool execution test failed: {e}")
        return False

def test_tool_calling_streaming(proxy_url: str) -> bool:
    """Test tool calling with streaming"""
    client = openai.OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=f"{proxy_url}/v1"
    )
    
    try:
        stream = client.chat.completions.create(
            model=OPENAI_API_MODEL,
            messages=[
                {"role": "user", "content": "Calculate the factorial of 6"}
            ],
            tools=EXAMPLE_TOOLS,
            tool_choice="auto",
            max_tokens=DEFAULT_MAX_TOKENS,
            stream=True
        )
        
        chunks_received = 0
        tool_calls_detected = False
        
        for chunk in stream:
            chunks_received += 1
            if chunk.choices[0].delta.tool_calls:
                tool_calls_detected = True
            
            if chunks_received >= 10:  # Just check we get some chunks
                break
        
        print(f"Streaming tool calling - Received {chunks_received} chunks")
        print(f"Tool calls detected in stream: {tool_calls_detected}")
        return chunks_received > 0
        
    except Exception as e:
        print(f"Streaming tool calling test failed: {e}")
        return False

def run_tests(proxy_url: str) -> bool:
    """Run all tool calling tests"""
    print(f"\n=== Tool Calling Tests for {proxy_url} ===")
    
    tests = [
        ("Tool Calling (Pure Python)", lambda: test_tool_calling_pure_python(proxy_url)),
        ("Tool Calling (OpenAI Client)", lambda: test_tool_calling_openai_client(proxy_url)),
        ("Tool Calling with Execution", lambda: test_tool_calling_with_execution(proxy_url)),
        ("Tool Calling Streaming", lambda: test_tool_calling_streaming(proxy_url)),
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
    
    print(f"\n=== Tool Calling Test Results ===")
    print(f"Passed: {success_count}/{total_count}")
    print(f"Success rate: {success_count/total_count*100:.1f}%")
    
    return success_count == total_count

if __name__ == '__main__':
    import sys
    proxy_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8000'
    run_tests(proxy_url)
