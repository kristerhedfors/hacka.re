# Function Calling Model Compatibility Tests

This document describes the function calling tests for different AI models across Groq Cloud and OpenAI.

## Overview

We've identified that different models handle function calling differently, with some models using different formats or protocols. These tests systematically check which models work correctly with the hacka.re function calling system.

## Test Files

### 1. `test_function_calling_models.py`
Comprehensive tests for function calling across different models:
- Tests simple functions (getCurrentTime)
- Tests functions with parameters (addNumbers)
- Tests complex functions (Shodan hostinfo)
- Runs on both Groq and OpenAI models

### 2. `test_function_format_compatibility.py`
Format compatibility tests to identify response format differences:
- Tests a simple echo function
- Analyzes response formats (tool_calls, function_call, JSON, XML, etc.)
- Generates compatibility report
- Doesn't fail on incompatible models (reports only)

## Models Tested

### Groq Cloud Models
- **llama-3.3-70b-versatile** - Llama model (typically works well)
- **llama-3.1-8b-instant** - Smaller Llama model
- **moonshotai/kimi-k2-instruct** - Kimi model (reported to work)
- **compound-beta** - GPT-OSS equivalent
- **compound-beta-mini** - Smaller compound model
- **gemma2-9b-it** - Gemma model (may have issues)
- **qwen-qwq-32b** - Qwen model

### OpenAI Models
- **gpt-5-nano** - Primary test model (cost-efficient)
- **gpt-4o** - Full GPT-4o
- **gpt-4.1-mini** - Latest mini model
- **o4-mini** - O4 mini model

## Running the Tests

### Setup

1. **Configure API Keys**
   ```bash
   # Edit the .env file
   cp _tests/playwright/.env.example _tests/playwright/.env
   # Add your keys:
   # OPENAI_API_KEY=sk-...
   # GROQ_API_KEY=gsk_...
   ```

2. **Install Dependencies**
   ```bash
   ./setup_environment.sh
   ```

### Run All Model Tests

```bash
# Test all models (both Groq and OpenAI)
_tests/playwright/run_model_function_tests.sh

# Test only Groq models
_tests/playwright/run_model_function_tests.sh --groq

# Test only OpenAI models
_tests/playwright/run_model_function_tests.sh --openai

# Test specific model
_tests/playwright/run_model_function_tests.sh --model llama-3.3-70b-versatile

# Run in headed mode (see browser)
_tests/playwright/run_model_function_tests.sh --headed

# Verbose output
_tests/playwright/run_model_function_tests.sh -v
```

### Run Format Compatibility Tests

```bash
# From project root
_venv/bin/python -m pytest _tests/playwright/test_function_format_compatibility.py -v

# Test specific provider
_venv/bin/python -m pytest _tests/playwright/test_function_format_compatibility.py -k groq -v

# Generate full compatibility report
_venv/bin/python -m pytest _tests/playwright/test_function_format_compatibility.py::test_format_summary -v -s
```

### Run Individual Tests

```bash
# Test single model with simple function
_venv/bin/python -m pytest _tests/playwright/test_function_calling_models.py::test_groq_function_calling[llama-3.3-70b-versatile] -v -s

# Test complex Shodan function
_venv/bin/python -m pytest _tests/playwright/test_function_calling_models.py::test_groq_complex_function -v -s
```

## Known Issues & Compatibility

### Working Models
✅ **Consistently Working:**
- OpenAI: gpt-4o, gpt-5-nano, gpt-4.1-mini
- Groq: llama-3.3-70b-versatile, llama-3.1-8b-instant

✅ **Usually Working:**
- Groq: moonshotai/kimi-k2-instruct
- Groq: compound-beta (GPT-OSS)

### Models with Issues
⚠️ **Inconsistent:**
- Some Groq models may use different function calling formats
- Gemma models may not support function calling
- Smaller models may have limited function calling capabilities

### Response Format Variations

Different models may use different formats for function calling:

1. **Standard OpenAI Format** (tool_calls)
   ```json
   {
     "tool_calls": [{
       "id": "call_123",
       "type": "function",
       "function": {
         "name": "functionName",
         "arguments": "{\"param\": \"value\"}"
       }
     }]
   }
   ```

2. **Legacy Format** (function_call)
   ```json
   {
     "function_call": {
       "name": "functionName",
       "arguments": "{\"param\": \"value\"}"
     }
   }
   ```

3. **Alternative Formats**
   - Some models may use XML-style tags
   - Some may use plain text descriptions
   - Some may use custom JSON structures

## Test Strategy

### Phase 1: Simple Function Testing
Start with the simplest possible function to verify basic compatibility:
```javascript
function getCurrentTime() {
    return { timestamp: Date.now() };
}
```

### Phase 2: Parameter Testing
Test functions with parameters:
```javascript
function addNumbers(a, b) {
    return { result: a + b };
}
```

### Phase 3: Complex Function Testing
Test real-world complex functions like Shodan hostinfo:
```javascript
async function hostinfo(ip, apiKey) {
    // Complex API call simulation
    return { /* detailed response */ };
}
```

## Debugging Failed Tests

### Check Console Output
The tests capture console messages. Look for:
- Function execution logs
- API response format
- Error messages

### Review Screenshots
Screenshots are saved with metadata in:
- `_tests/playwright/screenshots/` - Images
- `_tests/playwright/screenshots_data/` - Metadata

### Enable Verbose Mode
```bash
_tests/playwright/run_model_function_tests.sh -v --headed
```

### Check Specific Model
```bash
# Test one model in detail
_venv/bin/python -m pytest _tests/playwright/test_function_format_compatibility.py -k "groq and llama-3.3" -v -s
```

## Adding New Models

To test additional models, edit the test files:

1. Add to `GROQ_MODELS` or `OPENAI_MODELS` list in `test_function_calling_models.py`
2. Add to `PRIORITY_MODELS` in `test_function_format_compatibility.py`
3. Run the tests to verify compatibility

## Cost Considerations

- OpenAI tests use `gpt-5-nano` by default (cost-efficient)
- Groq Cloud is generally free or very low cost
- Complex function tests have longer timeouts (45 seconds)
- Consider using `--model` flag to test specific models only

## Continuous Integration

These tests can be integrated into CI/CD:
```yaml
# Example GitHub Actions
- name: Test Function Calling
  run: |
    ./setup_environment.sh
    _tests/playwright/run_model_function_tests.sh --headless
```

## Reporting Issues

When reporting function calling issues:
1. Note the specific model and provider
2. Include the response format analysis
3. Attach screenshots from failed tests
4. Include console logs if available
5. Specify the function being tested

## Summary

These tests help identify which models properly support function calling in hacka.re. Regular testing ensures compatibility as new models are released and existing models are updated.