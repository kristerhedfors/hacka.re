/**
 * CORS-Friendly APIs for hacka.re
 * 
 * This file contains examples of APIs that are known to work with browser-based 
 * requests without CORS issues. These can be used as tool definitions in hacka.re.
 */

// Collection of CORS-friendly API tool definitions
const corsFriendlyApis = [
    // 1. JSONPlaceholder - Free fake API for testing and prototyping
    {
        name: "get_posts",
        description: "Get posts from JSONPlaceholder API",
        endpoint: "https://jsonplaceholder.typicode.com/posts",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {
                userId: {
                    type: "integer",
                    description: "Filter posts by user ID (optional)"
                },
                id: {
                    type: "integer",
                    description: "Get a specific post by ID (optional)"
                }
            },
            required: []
        }
    },
    
    // 2. Public APIs from public-apis.io - CORS-enabled
    {
        name: "random_joke",
        description: "Get a random joke",
        endpoint: "https://official-joke-api.appspot.com/random_joke",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    },
    
    // 3. Random User Generator - CORS-enabled
    {
        name: "random_user",
        description: "Generate random user data",
        endpoint: "https://randomuser.me/api/",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {
                results: {
                    type: "integer",
                    description: "Number of users to generate (default: 1)"
                },
                gender: {
                    type: "string",
                    enum: ["male", "female"],
                    description: "Specify gender of users (optional)"
                },
                nat: {
                    type: "string",
                    description: "Nationality code (e.g., US, GB, FR) (optional)"
                }
            },
            required: []
        }
    },
    
    // 4. REST Countries - CORS-enabled
    {
        name: "country_info",
        description: "Get information about countries",
        endpoint: "https://restcountries.com/v3.1/name/{name}",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Country name or part of name"
                }
            },
            required: ["name"]
        }
    },
    
    // 5. Open Library - CORS-enabled
    {
        name: "book_search",
        description: "Search for books by title, author, or subject",
        endpoint: "https://openlibrary.org/search.json",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {
                q: {
                    type: "string",
                    description: "Search query (title, author, etc.)"
                },
                limit: {
                    type: "integer",
                    description: "Maximum number of results (optional)"
                }
            },
            required: ["q"]
        }
    },
    
    // 6. CoinGecko API - CORS-enabled cryptocurrency data
    {
        name: "crypto_price",
        description: "Get cryptocurrency price information",
        endpoint: "https://api.coingecko.com/api/v3/simple/price",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {
                ids: {
                    type: "string",
                    description: "Comma-separated list of cryptocurrency IDs (e.g., bitcoin,ethereum)"
                },
                vs_currencies: {
                    type: "string",
                    description: "Comma-separated list of currencies (e.g., usd,eur)"
                }
            },
            required: ["ids", "vs_currencies"]
        }
    },
    
    // 7. CORS-enabled Weather API alternative (weatherapi.com)
    {
        name: "weather_info",
        description: "Get current weather information for a location",
        endpoint: "https://api.weatherapi.com/v1/current.json",
        method: "GET",
        authType: "custom",
        authHeader: "key",
        parameters: {
            type: "object",
            properties: {
                q: {
                    type: "string",
                    description: "Location name, zip code, or coordinates"
                }
            },
            required: ["q"]
        }
    },
    
    // 8. Quotable - Random quotes API (CORS-enabled)
    {
        name: "random_quote",
        description: "Get a random quote",
        endpoint: "https://api.quotable.io/random",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {
                tags: {
                    type: "string",
                    description: "Filter by tag(s), comma-separated (optional)"
                },
                maxLength: {
                    type: "integer",
                    description: "Maximum length in characters (optional)"
                }
            },
            required: []
        }
    },
    
    // 9. Dog API - Random dog images (CORS-enabled)
    {
        name: "random_dog",
        description: "Get a random dog image",
        endpoint: "https://dog.ceo/api/breeds/image/random",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    },
    
    // 10. Cat Facts API - Random cat facts (CORS-enabled)
    {
        name: "cat_fact",
        description: "Get a random cat fact",
        endpoint: "https://catfact.ninja/fact",
        method: "GET",
        authType: "none",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    }
];

// Function to add a specific API tool to localStorage
function addApiTool(toolName) {
    const STORAGE_KEY = 'hacka_re_api_tools';
    
    // Find the tool by name
    const tool = corsFriendlyApis.find(api => api.name === toolName);
    if (!tool) {
        console.error(`Tool "${toolName}" not found in the list of CORS-friendly APIs`);
        return false;
    }
    
    // Get existing tools
    const existingTools = localStorage.getItem(STORAGE_KEY);
    let tools = [];
    
    if (existingTools) {
        try {
            tools = JSON.parse(existingTools);
        } catch (error) {
            console.error('Error parsing existing tools:', error);
        }
    }
    
    // Add or update the tool
    const existingToolIndex = tools.findIndex(t => t.name === tool.name);
    if (existingToolIndex >= 0) {
        tools[existingToolIndex] = tool;
    } else {
        tools.push(tool);
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
    console.log(`API tool "${toolName}" added successfully!`);
    return true;
}

// Function to add all CORS-friendly APIs to localStorage
function addAllCorsFriendlyApis() {
    const STORAGE_KEY = 'hacka_re_api_tools';
    
    // Get existing tools
    const existingTools = localStorage.getItem(STORAGE_KEY);
    let tools = [];
    
    if (existingTools) {
        try {
            tools = JSON.parse(existingTools);
        } catch (error) {
            console.error('Error parsing existing tools:', error);
        }
    }
    
    // Add or update all tools
    corsFriendlyApis.forEach(api => {
        const existingToolIndex = tools.findIndex(tool => tool.name === api.name);
        if (existingToolIndex >= 0) {
            tools[existingToolIndex] = api;
        } else {
            tools.push(api);
        }
    });
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
    console.log(`Added ${corsFriendlyApis.length} CORS-friendly API tools successfully!`);
    return true;
}

// Export functions if using as a module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        corsFriendlyApis,
        addApiTool,
        addAllCorsFriendlyApis
    };
}
