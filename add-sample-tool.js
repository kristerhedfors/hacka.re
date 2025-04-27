/**
 * Sample Tool Implementation for hacka.re
 * 
 * This file demonstrates how to create and register a custom tool with the hacka.re API Tools Service.
 * You can use this as a template for creating your own tools.
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if ApiToolsService exists
    if (typeof ApiToolsService === 'undefined') {
        console.error('ApiToolsService is not available. Make sure you have included api-tools-service.js in your HTML.');
        return;
    }
    
    // Register a sample weather tool
    ApiToolsService.registerTool(
        "get_weather_tool",
        {
            type: "function",
            function: {
                name: "get_weather_tool",
                description: "Get the current weather for a location",
                parameters: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "The city and state/country, e.g. 'San Francisco, CA' or 'Paris, France'"
                        },
                        unit: {
                            type: "string",
                            enum: ["celsius", "fahrenheit"],
                            description: "The unit of temperature to use (celsius or fahrenheit)"
                        }
                    },
                    required: ["location"]
                }
            }
        },
        async function(args) {
            const { location, unit = "celsius" } = args;
            
            // This is a mock implementation - in a real tool, you would call a weather API
            console.log(`Getting weather for ${location} in ${unit}`);
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Return mock weather data
            return {
                location: location,
                temperature: unit === "celsius" ? 22 : 72,
                unit: unit,
                condition: "Sunny",
                humidity: 65,
                wind_speed: 10,
                wind_direction: "NW",
                last_updated: new Date().toISOString()
            };
        }
    );
    
    // Register a sample translation tool
    ApiToolsService.registerTool(
        "translate_text_tool",
        {
            type: "function",
            function: {
                name: "translate_text_tool",
                description: "Translate text from one language to another",
                parameters: {
                    type: "object",
                    properties: {
                        text: {
                            type: "string",
                            description: "The text to translate"
                        },
                        source_language: {
                            type: "string",
                            description: "The source language code (e.g., 'en' for English)"
                        },
                        target_language: {
                            type: "string",
                            description: "The target language code (e.g., 'fr' for French)"
                        }
                    },
                    required: ["text", "target_language"]
                }
            }
        },
        async function(args) {
            const { text, source_language = "auto", target_language } = args;
            
            // This is a mock implementation - in a real tool, you would call a translation API
            console.log(`Translating from ${source_language} to ${target_language}: ${text}`);
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Return mock translation data
            // In a real implementation, you would call an actual translation service
            let translatedText;
            if (target_language === "fr") {
                translatedText = "Ceci est une traduction simulée.";
            } else if (target_language === "es") {
                translatedText = "Esta es una traducción simulada.";
            } else if (target_language === "de") {
                translatedText = "Dies ist eine simulierte Übersetzung.";
            } else {
                translatedText = "This is a simulated translation.";
            }
            
            return {
                original_text: text,
                translated_text: translatedText,
                source_language: source_language,
                target_language: target_language
            };
        }
    );
    
    console.log('Sample tools registered successfully. You can now use get_weather_tool and translate_text_tool in your chat.');
});

/**
 * How to Use Custom Tools
 * 
 * 1. Include this JavaScript file in your HTML after api-tools-service.js:
 *    <script src="js/services/api-tools-service.js"></script>
 *    <script src="add-sample-tool.js"></script>
 * 
 * 2. Enable tool calling in the settings (Settings > Experimental Features > Enable tool calling)
 * 
 * 3. Ask the AI to use one of the tools, for example:
 *    - "What's the weather like in Paris?"
 *    - "Translate 'Hello, how are you?' to French."
 * 
 * Creating Your Own Tools
 * 
 * To create your own tool, follow this template:
 * 
 * ApiToolsService.registerTool(
 *     "your_tool_name",
 *     {
 *         type: "function",
 *         function: {
 *             name: "your_tool_name",
 *             description: "Description of what your tool does",
 *             parameters: {
 *                 type: "object",
 *                 properties: {
 *                     // Define your parameters here
 *                     param1: {
 *                         type: "string",
 *                         description: "Description of parameter 1"
 *                     },
 *                     param2: {
 *                         type: "number",
 *                         description: "Description of parameter 2"
 *                     }
 *                 },
 *                 required: ["param1"] // List required parameters
 *             }
 *         }
 *     },
 *     async function(args) {
 *         // Implement your tool's functionality here
 *         const { param1, param2 } = args;
 *         
 *         // Process the parameters and return a result
 *         return {
 *             result: `Processed ${param1} and ${param2}`
 *         };
 *     }
 * );
 */
