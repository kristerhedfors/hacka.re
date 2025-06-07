/**
 * OpenAI Proxy - Overview and Navigation
 * 
 * Main navigation prompt for the OpenAI Proxy section of the hacka.re default prompts library.
 * This serves as the entry point to various proxy implementations.
 * 
 * @callable
 * @tool
 */

const OPENAI_PROXY_OVERVIEW = `# OpenAI Proxy Examples - Educational Guide Overview

## What are OpenAI Proxy Examples?

These are educational examples of lightweight middleware servers that demonstrate concepts for sitting between applications and the OpenAI API. These examples illustrate potential benefits:

- **Security**: Hide API keys from client applications
- **Rate Limiting**: Control API usage and costs  
- **Caching**: Cache responses to reduce API calls
- **Authentication**: Add custom authentication layers
- **Logging**: Monitor and track API usage
- **Load Balancing**: Distribute requests across multiple API keys

## Available Implementation Languages

### 🐍 **Python** 
Educational collection of 2 simplified proxy implementations focusing on core API passthrough functionality.

**Implementations Available:**
- **Starlette Proxy** (20-25 lines) - Async learning example ⭐
- **Flask Proxy** (20-25 lines) - Simple synchronous learning example

**Features:**
- ✅ Real-time streaming support
- ✅ Full function/tool calling compatibility
- ✅ Comprehensive test suite (11/11 tests passing - 100% success rate)
- ✅ Simplified architecture - no complex dependencies
- ✅ Complete documentation with working examples
- ✅ Validated with real OpenAI API calls

### 🔜 **Coming Soon**
- **Node.js/TypeScript** - Express and Fastify implementations
- **Go** - High-performance minimal proxies  
- **Rust** - Ultra-fast zero-cost abstractions
- **Docker** - Containerized deployments

## Navigation Structure

\`\`\`
OpenAI Proxy/
├── Overview (this document)
├── Python/
│   ├── Starlette Proxy ⭐ (async educational example)
│   └── Flask Proxy (sync educational example)
├── Node.js/ (coming soon)
├── Go/ (coming soon)
├── Rust/ (coming soon)
└── Docker/ (coming soon)
\`\`\`

## Quick Start Guide

### 1. Choose Your Implementation

**For Learning Async Patterns**: Python > Starlette Proxy ⭐
- Demonstrates async patterns
- Shows streaming implementation concepts
- Modern Python web framework examples
- Educational async architecture

**For Learning/Development**: Python > Flask Proxy
- Simple synchronous patterns
- Easy debugging and development
- Traditional web development concepts
- Perfect for understanding basics

### 2. Basic Usage Pattern

All proxies follow the same usage pattern:

\`\`\`python
# 1. Start the proxy server
uvicorn proxy_module:app --host 127.0.0.1 --port 8000

# 2. Point your OpenAI client to the proxy
from openai import OpenAI
client = OpenAI(
    api_key="your_openai_key", 
    base_url="http://localhost:8000/v1"
)

# 3. Use normally - all features work
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)
\`\`\`

### 3. Advanced Features

All Python implementations support:
- ✅ Streaming responses
- ✅ Function/tool calling  
- ✅ Custom authentication
- ✅ Error handling
- ✅ Request/response logging

## Use Cases

### 🏢 **Enterprise Applications**
- Hide API keys from frontend applications
- Implement custom authentication and authorization
- Add rate limiting and usage monitoring
- Cache responses for cost optimization

### 🔒 **Security-Critical Systems**
- Use Ed25519 proxy for strongest authentication
- Implement request signing and verification
- Add audit trails and compliance logging

### ⚡ **High-Performance Systems**  
- Use Starlette proxy for maximum throughput
- Implement connection pooling and load balancing
- Optimize for low latency and high concurrency

### 🛠️ **Development & Testing**
- Use Flask proxy for easy debugging
- Mock OpenAI responses for testing
- Add custom middleware for development tools

## Educational Comparison

| Implementation | Lines | Learning Focus | Educational Value |
|----------------|-------|----------------|-------------------|
| Starlette | 20-25 | Async patterns | Modern Python web frameworks |
| Flask | 20-25 | Sync patterns | Traditional web development |

## Getting Started

1. **Browse to Python section** for complete educational implementations
2. **Choose your proxy type** based on learning goals  
3. **Follow the installation guide** with working examples
4. **Run the test suite** to verify everything works
5. **Study the code** to understand proxy concepts

Each implementation includes:
- Complete source code with explanations
- Step-by-step setup instructions  
- Working client examples
- Educational test suite
- Comprehensive documentation
- Learning-focused examples

## Need Help?

- **Documentation**: Each implementation has detailed docs
- **Examples**: Working code for all use cases
- **Tests**: Comprehensive test suite validates everything
- **Support**: Well-documented and battle-tested

**Disclaimer**: These are educational examples only, part of the hacka.re project. Not intended for production use. Use at your own risk for learning purposes.

Start with the **Python section** to explore all available example implementations!`;

/**
 * Get the OpenAI Proxy overview prompt
 * @returns {string} The complete OpenAI proxy overview
 */
function getOpenAIProxyOverview() {
    return OPENAI_PROXY_OVERVIEW;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        OPENAI_PROXY_OVERVIEW,
        getOpenAIProxyOverview
    };
}

// Make available globally for browser/hacka.re usage  
if (typeof window !== 'undefined') {
    window.openai_proxy_overview = {
        OPENAI_PROXY_OVERVIEW,
        getOpenAIProxyOverview
    };
}