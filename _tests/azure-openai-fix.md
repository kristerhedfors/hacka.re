# Azure OpenAI Integration Fix

## Issue Description

When using Azure OpenAI as the provider, the application was incorrectly constructing API URLs by mixing the OpenAI base URL with Azure OpenAI-specific paths. This resulted in requests being sent to:

```
https://api.openai.com/v1/openai/models?api-version=2024-03-01-preview
```

Instead of the correct Azure OpenAI endpoint:

```
https://{your-resource-name}.openai.azure.com/openai/models?api-version=2024-03-01-preview
```

## Root Cause

The issue was caused by three main problems:

1. In `base-url-manager.js`, the `determineBaseUrl` function was incorrectly using the custom URL field value for Azure OpenAI instead of the Azure API base URL from the Azure-specific settings.

2. In `api-service.js`, the `fetchAvailableModels` function was not properly handling the Azure OpenAI case, allowing it to use a custom base URL that might be set to the OpenAI URL.

3. In `api-service.js`, the `getBaseUrl` function did not prioritize the Azure API base URL for Azure OpenAI provider.

## Fix Implementation

The following changes were made to fix the issue:

1. Modified `base-url-manager.js` to use the Azure API base URL from the Azure-specific settings when the provider is Azure OpenAI:

```javascript
function determineBaseUrl(selectedProvider, customUrl) {
    if (selectedProvider === 'custom') {
        return customUrl.trim();
    } else if (selectedProvider === 'azure-openai') {
        // For Azure OpenAI, use the Azure API base URL from the Azure-specific settings
        const azureApiBase = elements.azureApiBase ? elements.azureApiBase.value.trim() : '';
        return azureApiBase;
    } else {
        return DataService.getDefaultBaseUrlForProvider(selectedProvider);
    }
}
```

2. Modified `api-service.js` to prioritize the Azure API base URL for Azure OpenAI provider in the `getBaseUrl` function:

```javascript
function getBaseUrl() {
    // Check if the current provider is Azure OpenAI
    if (isAzureOpenAI()) {
        // For Azure OpenAI, use the Azure API base URL
        const azureApiBase = StorageService.getAzureApiBase();
        if (azureApiBase) {
            return azureApiBase;
        }
    }
    
    // For other providers, use the standard base URL
    const baseUrl = StorageService.getBaseUrl();
    // Ensure we never return null or undefined
    if (!baseUrl || baseUrl === 'null' || baseUrl === 'undefined') {
        return StorageService.getDefaultBaseUrlForProvider('groq'); // Default to Groq if no base URL is set
    }
    return baseUrl;
}
```

3. Modified `api-service.js` to always use the `getEndpointUrl` function for Azure OpenAI in the `fetchAvailableModels` function:

```javascript
async function fetchAvailableModels(apiKey, customBaseUrl = null) {
    // ...
    
    // Determine which base URL to use
    let endpointUrl;
    if (isAzure) {
        // For Azure OpenAI, always use the getEndpointUrl function
        // which will use the Azure API base URL from storage
        endpointUrl = getEndpointUrl('MODELS');
    } else if (customBaseUrl && customBaseUrl !== 'null' && customBaseUrl !== 'undefined') {
        // For standard OpenAI-compatible API with custom base URL
        const normalizedBaseUrl = customBaseUrl.endsWith('/') ? customBaseUrl : `${customBaseUrl}/`;
        endpointUrl = `${normalizedBaseUrl}${ENDPOINT_PATHS.MODELS}`;
    } else {
        // Otherwise use the default endpoint URL
        endpointUrl = getEndpointUrl('MODELS');
    }
    
    // ...
}
```

4. Added debug logging to help diagnose and verify the fix.

## Testing

A debug test page was created at `_tests/azure-openai-debug.html` to help verify the fix. This page allows you to:

1. Configure Azure OpenAI settings
2. Save the settings
3. Fetch models from the Azure OpenAI API
4. View the console logs to verify the correct URLs are being constructed

To use the test page:

1. Open `_tests/azure-openai-debug.html` in your browser
2. Enter your Azure OpenAI settings:
   - Azure API Base URL (e.g., `https://your-resource-name.openai.azure.com`)
   - API Version (default: `2024-03-01-preview`)
   - Deployment Name
   - Model Name
   - API Key
3. Click "Save Settings"
4. Click "Fetch Models"
5. Check the console logs to verify the correct URLs are being constructed

## Verification

After implementing the fix, the application correctly constructs the Azure OpenAI endpoint URLs:

```
https://{your-resource-name}.openai.azure.com/openai/models?api-version=2024-03-01-preview
```

And for chat completions:

```
https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version=2024-03-01-preview
