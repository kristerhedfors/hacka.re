// Sample API tool for testing
const sampleTool = {
  name: "weather_lookup",
  description: "Get current weather information for a location",
  endpoint: "https://api.openweathermap.org/data/2.5/weather",
  method: "GET",
  authType: "none",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name or zip code"
      },
      units: {
        type: "string",
        enum: ["metric", "imperial"],
        description: "Temperature units (metric or imperial)"
      }
    },
    required: ["location"]
  }
};

// Add the tool to localStorage
const STORAGE_KEY = 'hacka_re_api_tools';
const existingTools = localStorage.getItem(STORAGE_KEY);
let tools = [];

if (existingTools) {
  try {
    tools = JSON.parse(existingTools);
  } catch (error) {
    console.error('Error parsing existing tools:', error);
  }
}

// Add the sample tool if it doesn't exist
const existingToolIndex = tools.findIndex(tool => tool.name === sampleTool.name);
if (existingToolIndex >= 0) {
  tools[existingToolIndex] = sampleTool;
} else {
  tools.push(sampleTool);
}

// Save to localStorage
localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));

console.log('Sample API tool added successfully!');
console.log('Tool count:', tools.length);
