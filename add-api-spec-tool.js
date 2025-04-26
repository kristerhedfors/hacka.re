/**
 * Add API Specification Tool Example
 * This script demonstrates how to create an API specification and save it as a tool
 */

// Sample API specification for a weather API
const weatherApiSpec = {
    title: "Weather API",
    description: "Get current weather information for a location",
    version: "1.0.0",
    endpoints: [
        {
            path: "/weather",
            method: "get",
            summary: "Get weather information",
            description: "Returns current weather for a location",
            parameters: [
                {
                    name: "location",
                    in: "query",
                    description: "City name or zip code",
                    required: true,
                    schema: {
                        type: "string"
                    }
                },
                {
                    name: "units",
                    in: "query",
                    description: "Temperature units (metric or imperial)",
                    required: false,
                    schema: {
                        type: "string",
                        enum: ["metric", "imperial"]
                    }
                }
            ]
        }
    ]
};

// Tool information
const weatherToolInfo = {
    name: "weather_lookup",
    description: "Get current weather information for a location",
    endpoint: "https://api.openweathermap.org/data/2.5/weather",
    authType: "none"
};

// Initialize services
if (window.ApiToolsService) {
    ApiToolsService.init();
    console.log('ApiToolsService initialized');
}

if (window.ApiSpecService) {
    ApiSpecService.init();
    console.log('ApiSpecService initialized');
} else {
    console.error('ApiSpecService not found. Make sure api-spec-service.js is loaded.');
}

// Create and save the tool
try {
    // Create the API specification
    const apiSpec = ApiSpecService.createApiSpec(weatherApiSpec);
    console.log('API specification created:', apiSpec);
    
    // Convert to tool definition
    const toolDefinition = ApiSpecService.convertSpecToTool(apiSpec, weatherToolInfo);
    console.log('Tool definition created:', toolDefinition);
    
    // Save the tool
    const success = ApiSpecService.saveApiTool(toolDefinition);
    
    if (success) {
        console.log(`Tool "${toolDefinition.name}" saved successfully!`);
        
        // Get all tools to verify
        const tools = ApiToolsService.getApiTools();
        console.log('All tools:', tools);
    } else {
        console.error('Failed to save tool.');
    }
} catch (error) {
    console.error('Error creating and saving tool:', error);
}

// Alternative method: Create and save in one step
try {
    // Create and save the tool
    const result = ApiSpecService.createAndSaveTool(weatherApiSpec, weatherToolInfo);
    console.log('Tool created and saved in one step:', result);
} catch (error) {
    console.error('Error creating and saving tool in one step:', error);
}

// Example of generating a tool from a description
try {
    const description = "An API that provides current weather information for a given location. It should accept a city name or zip code and return the current temperature, conditions, humidity, and wind speed.";
    
    // Generate tool definition from description
    const generatedTool = ApiSpecService.generateToolFromDescription(description);
    console.log('Generated tool definition from description:', generatedTool);
} catch (error) {
    console.error('Error generating tool from description:', error);
}

console.log('API specification tool example completed');
