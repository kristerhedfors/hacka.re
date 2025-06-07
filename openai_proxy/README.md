# OpenAI Proxy Examples

A simplified OpenAI API-compatible proxy implementation for educational purposes. Part of the hacka.re project.

## 🚀 Quick Start

### Available Proxies

```
OpenAI Proxy/
├── Starlette Proxy (20-25 lines) ⭐ RECOMMENDED - Async streaming support
└── Flask Proxy (20-25 lines) - Simple synchronous implementation
```

### Direct Usage

```bash
# Install dependencies
pip install -e .

# Start recommended proxy
uvicorn src.proxies.minimal.starlette_proxy:app --host 127.0.0.1 --port 8000

# Or start Flask proxy
python src/proxies/minimal/flask_proxy.py

# Test implementations
./run_tests.sh
```

## ✅ Status

**Simplified proxy implementations**

- ✅ Configuration working
- ✅ Both proxy implementations load correctly  
- ✅ OpenAI API passthrough functionality
- ✅ Streaming response support
- ✅ Function/tool calling compatibility
- ✅ Educational testing framework

## 📋 Features

- **2 Simple Implementations**: Starlette (async) and Flask (sync)
- **Real-time Streaming**: Both proxies support OpenAI streaming responses
- **Function Calling**: Compatible with OpenAI's function calling
- **API Key Passthrough**: Simple forwarding of Authorization headers
- **Educational Testing**: Test suite for validation

## 🎯 Use Cases

| Proxy Type | Lines | Focus | Best For |
|------------|-------|-------|----------|
| **Starlette** | 20-25 | Async patterns | Modern Python web frameworks, high performance |
| **Flask** | 20-25 | Synchronous patterns | Traditional web development, simplicity |

## 🧪 Testing

```bash
# Run test suite
./run_tests.sh

# Test individual components
python -m src.testing.test_pure_python http://localhost:8000
python -m src.testing.test_openai_api http://localhost:8000  
python -m src.testing.test_tool_calling http://localhost:8000
```

## 🔧 Configuration

```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_MODEL=gpt-4o-mini
OPENAI_API_BASE=https://api.openai.com/v1
EOF
```

## 🚀 Running the Proxies

**Starlette Proxy (Recommended)**
```bash
uvicorn src.proxies.minimal.starlette_proxy:app --host 127.0.0.1 --port 8000
```

**Flask Proxy**
```bash
python src/proxies/minimal/flask_proxy.py
```

## 📝 Usage

Both proxies simply forward requests to OpenAI's API with your API key:

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer your-openai-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

**Educational Examples Only** - These are simplified learning examples for the hacka.re project, not production software. Use at your own risk for educational purposes.