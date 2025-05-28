/**
 * Function Tools Parser
 * Handles argument parsing and tool definition generation
 */

window.FunctionToolsParser = (function() {
    const Logger = FunctionToolsLogger;
    const Storage = FunctionToolsStorage;
    
    const ArgumentParser = {
        parse: function(argsString, functionName) {
            Logger.debug(`Parsing arguments for function "${functionName}"`);
            Logger.debug(`Raw arguments string: ${argsString}`);
            
            try {
                const args = JSON.parse(argsString);
                Logger.debug(`JSON parsing successful for "${functionName}"`);
                Logger.debug(`Parsed arguments:`, args);
                
                // Convert argument types based on function parameter definitions
                const convertedArgs = this._convertArgumentTypes(args, functionName);
                Logger.debug(`Type-converted arguments:`, convertedArgs);
                
                return convertedArgs;
            } catch (parseError) {
                Logger.debug(`JSON parsing failed for "${functionName}": ${parseError.message}`);
                return this._parseAlternative(argsString, functionName);
            }
        },
        
        _convertArgumentTypes: function(args, functionName) {
            const jsFunctions = Storage.getJsFunctions();
            const functionDef = jsFunctions[functionName];
            if (!functionDef?.toolDefinition?.function?.parameters?.properties) {
                Logger.debug(`No parameter definitions found for "${functionName}", returning args as-is`);
                return args;
            }
            
            const paramProperties = functionDef.toolDefinition.function.parameters.properties;
            const convertedArgs = {};
            
            for (const [paramName, value] of Object.entries(args)) {
                const paramDef = paramProperties[paramName];
                if (!paramDef) {
                    // Parameter not defined in schema, keep as-is
                    convertedArgs[paramName] = value;
                    continue;
                }
                
                // Convert based on parameter type
                convertedArgs[paramName] = this._convertValue(value, paramDef.type, paramName);
                Logger.debug(`Converted parameter "${paramName}" from ${typeof value} to ${typeof convertedArgs[paramName]}: ${value} -> ${convertedArgs[paramName]}`);
            }
            
            return convertedArgs;
        },
        
        _convertValue: function(value, targetType, paramName) {
            // If value is already the correct type, return as-is
            if (targetType === 'string' && typeof value === 'string') return value;
            if (targetType === 'number' && typeof value === 'number') return value;
            if (targetType === 'boolean' && typeof value === 'boolean') return value;
            if (targetType === 'object' && typeof value === 'object') return value;
            if (targetType === 'array' && Array.isArray(value)) return value;
            
            try {
                switch (targetType) {
                    case 'number':
                        if (typeof value === 'string') {
                            const numValue = Number(value);
                            if (isNaN(numValue)) {
                                Logger.debug(`Warning: Could not convert "${value}" to number for parameter "${paramName}"`);
                                return value; // Return original value if conversion fails
                            }
                            return numValue;
                        }
                        break;
                        
                    case 'boolean':
                        if (typeof value === 'string') {
                            if (value.toLowerCase() === 'true') return true;
                            if (value.toLowerCase() === 'false') return false;
                        }
                        break;
                        
                    case 'object':
                        if (typeof value === 'string') {
                            try {
                                return JSON.parse(value);
                            } catch (e) {
                                Logger.debug(`Warning: Could not parse "${value}" as JSON for parameter "${paramName}"`);
                            }
                        }
                        break;
                        
                    case 'array':
                        if (typeof value === 'string') {
                            try {
                                const parsed = JSON.parse(value);
                                if (Array.isArray(parsed)) return parsed;
                            } catch (e) {
                                Logger.debug(`Warning: Could not parse "${value}" as array for parameter "${paramName}"`);
                            }
                        }
                        break;
                        
                    case 'string':
                    default:
                        // Convert to string if needed
                        if (typeof value !== 'string') {
                            return String(value);
                        }
                        break;
                }
            } catch (error) {
                Logger.debug(`Error converting value "${value}" to type "${targetType}" for parameter "${paramName}": ${error.message}`);
            }
            
            // If conversion fails or type is not recognized, return original value
            return value;
        },
        
        _parseAlternative: function(argsString, functionName) {
            Logger.debug(`Attempting alternative parsing for "${functionName}"`);
            
            const jsFunctions = Storage.getJsFunctions();
            const functionDef = jsFunctions[functionName];
            if (!functionDef?.toolDefinition?.function?.parameters?.properties) {
                throw new Error(`No parameter definitions found for function "${functionName}"`);
            }
            
            const paramNames = Object.keys(functionDef.toolDefinition.function.parameters.properties);
            Logger.debug(`Extracted parameter names:`, paramNames);
            
            if (paramNames.length === 0) {
                throw new Error(`No parameter names found for function "${functionName}"`);
            }
            
            // Split by spaces, but respect quoted strings
            const argValues = argsString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
            Logger.debug(`Split argument values:`, argValues);
            
            const args = {};
            paramNames.forEach((paramName, index) => {
                if (index < argValues.length) {
                    let value = argValues[index];
                    // Remove quotes if present
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.substring(1, value.length - 1);
                    }
                    args[paramName] = value;
                    Logger.debug(`Mapped parameter "${paramName}" to value: ${value}`);
                }
            });
            
            Logger.debug(`Alternative parsing result for "${functionName}":`, args);
            return args;
        }
    };
    
    const ToolDefinitionGenerator = {
        generate: function(code) {
            try {
                const functionMatch = code.match(/^\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/);
                if (!functionMatch) {
                    return null;
                }
                
                const functionName = functionMatch[1];
                const paramsString = functionMatch[2];
                
                const toolDefinition = this._createBaseDefinition(functionName);
                this._addParameters(toolDefinition, paramsString, functionName);
                this._enhanceWithJSDoc(toolDefinition, code);
                
                return toolDefinition;
            } catch (error) {
                console.error('Error generating tool definition:', error);
                return null;
            }
        },
        
        _createBaseDefinition: function(functionName) {
            return {
                type: 'function',
                function: {
                    name: functionName,
                    description: `Function ${functionName} for tool calling`,
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            };
        },
        
        _addParameters: function(toolDefinition, paramsString, functionName) {
            if (!paramsString.trim()) return;
            
            const params = paramsString.split(',').map(p => p.trim());
            
            params.forEach(param => {
                const hasDefault = param.includes('=');
                const paramName = hasDefault ? param.split('=')[0].trim() : param;
                
                toolDefinition.function.parameters.properties[paramName] = {
                    type: 'string',
                    description: `Parameter ${paramName} for function ${functionName}`
                };
                
                if (!hasDefault) {
                    toolDefinition.function.parameters.required.push(paramName);
                }
            });
        },
        
        _enhanceWithJSDoc: function(toolDefinition, code) {
            const jsDocMatch = code.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
            if (!jsDocMatch) return;
            
            const jsDoc = jsDocMatch[1];
            
            // Extract function description
            const descMatch = jsDoc.match(/@description\s+(.*?)(?=\s*@|\s*\*\/|$)/s);
            if (descMatch) {
                toolDefinition.function.description = descMatch[1].replace(/\s*\*\s*/g, ' ').trim();
            }
            
            // Extract param descriptions and types
            const paramMatches = jsDoc.matchAll(/@param\s+{([^}]+)}\s+([^\s]+)\s+(.*?)(?=\s*@|\s*\*\/|$)/gs);
            for (const match of paramMatches) {
                const [, type, name, description] = match;
                
                if (toolDefinition.function.parameters.properties[name]) {
                    toolDefinition.function.parameters.properties[name].type = this._mapJSTypeToJSONType(type);
                    toolDefinition.function.parameters.properties[name].description = description.replace(/\s*\*\s*/g, ' ').trim();
                }
            }
        },
        
        _mapJSTypeToJSONType: function(jsType) {
            const typeMap = {
                'string': 'string',
                'number': 'number',
                'boolean': 'boolean',
                'object': 'object',
                'array': 'array',
                'null': 'null',
                'undefined': 'null',
                'any': 'string'
            };
            
            return typeMap[jsType.toLowerCase()] || 'string';
        }
    };
    
    // Public API
    return {
        ArgumentParser,
        ToolDefinitionGenerator
    };
})();
