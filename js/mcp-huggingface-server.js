/**
 * Hugging Face MCP Server for hacka.re
 * 
 * This file defines a static MCP server that provides tools for interacting with
 * Hugging Face models and APIs using the official Hugging Face JavaScript library.
 */

(function() {
    // Wait for DOM content to be loaded to ensure StaticMcpServer and HuggingFace are available
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof StaticMcpServer === 'undefined') {
            console.error('StaticMcpServer is not available. Hugging Face MCP server will not be registered.');
            return;
        }
        
        if (typeof window.HuggingFace === 'undefined') {
            console.error('HuggingFace library is not available. Hugging Face MCP server will not be registered.');
            return;
        }
        
        // Create a Hugging Face MCP server
        const hfServer = StaticMcpServer.createStaticServer(
            'huggingface',
            'Hugging Face MCP server providing access to Hugging Face models and APIs'
        );
        
        // Create a Hugging Face client (without API key for now)
        let hfClient = window.HuggingFace.createClient();
        
        // Add text generation tool
        StaticMcpServer.addTool(
            hfServer,
            'hf_text_generation',
            'Generate text using a Hugging Face text generation model',
            {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'The model ID to use (e.g., "meta-llama/Llama-3.1-8B-Instruct")'
                    },
                    prompt: {
                        type: 'string',
                        description: 'The prompt to generate text from'
                    },
                    max_tokens: {
                        type: 'integer',
                        description: 'Maximum number of tokens to generate'
                    },
                    temperature: {
                        type: 'number',
                        description: 'Sampling temperature (0.0 to 2.0)'
                    },
                    api_key: {
                        type: 'string',
                        description: 'Optional Hugging Face API key'
                    }
                },
                required: ['model', 'prompt']
            },
            async function(args) {
                const { model, prompt, max_tokens = 100, temperature = 0.7, api_key } = args;
                
                console.log(`HF Text Generation: ${model} with prompt: ${prompt}`);
                
                try {
                    // Update API key if provided
                    if (api_key) {
                        hfClient = window.HuggingFace.createClient(api_key);
                    }
                    
                    // In a real implementation with proper CORS setup, this would work
                    // For now, we'll simulate the response
                    
                    // Simulate API call delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Return simulated result
                    return {
                        model: model,
                        generated_text: `This is a simulated response from the ${model} model based on your prompt: "${prompt}". In a production environment with proper CORS setup, this would call the actual Hugging Face API.`,
                        usage: {
                            prompt_tokens: prompt.length / 4, // Rough approximation
                            completion_tokens: max_tokens,
                            total_tokens: (prompt.length / 4) + max_tokens
                        }
                    };
                } catch (error) {
                    console.error('Error calling Hugging Face API:', error);
                    return {
                        error: `Error generating text: ${error.message}`,
                        model: model
                    };
                }
            }
        );
        
        // Add text-to-image tool
        StaticMcpServer.addTool(
            hfServer,
            'hf_text_to_image',
            'Generate an image from text using a Hugging Face diffusion model',
            {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'The model ID to use (e.g., "stabilityai/stable-diffusion-xl-base-1.0")'
                    },
                    prompt: {
                        type: 'string',
                        description: 'The text prompt describing the image to generate'
                    },
                    negative_prompt: {
                        type: 'string',
                        description: 'Text describing what should not be in the image'
                    },
                    width: {
                        type: 'integer',
                        description: 'Width of the generated image'
                    },
                    height: {
                        type: 'integer',
                        description: 'Height of the generated image'
                    },
                    api_key: {
                        type: 'string',
                        description: 'Optional Hugging Face API key'
                    }
                },
                required: ['model', 'prompt']
            },
            async function(args) {
                const { 
                    model, 
                    prompt, 
                    negative_prompt = '', 
                    width = 512, 
                    height = 512,
                    api_key
                } = args;
                
                console.log(`HF Text-to-Image: ${model} with prompt: ${prompt}`);
                
                try {
                    // Update API key if provided
                    if (api_key) {
                        hfClient = window.HuggingFace.createClient(api_key);
                    }
                    
                    // In a real implementation with proper CORS setup, this would work
                    // For now, we'll simulate the response
                    
                    // Simulate API call delay
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Return simulated result with a placeholder image URL
                    return {
                        model: model,
                        prompt: prompt,
                        negative_prompt: negative_prompt,
                        width: width,
                        height: height,
                        image_url: 'https://placehold.co/512x512/EEE/31343C?text=AI+Generated+Image&font=playfair',
                        message: 'This is a placeholder image. In a production environment with proper CORS setup, this would call the actual Hugging Face API.'
                    };
                } catch (error) {
                    console.error('Error calling Hugging Face API:', error);
                    return {
                        error: `Error generating image: ${error.message}`,
                        model: model
                    };
                }
            }
        );
        
        // Add translation tool
        StaticMcpServer.addTool(
            hfServer,
            'hf_translation',
            'Translate text from one language to another using a Hugging Face translation model',
            {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'The model ID to use (e.g., "Helsinki-NLP/opus-mt-en-fr")'
                    },
                    text: {
                        type: 'string',
                        description: 'The text to translate'
                    },
                    source_lang: {
                        type: 'string',
                        description: 'The source language code (e.g., "en" for English)'
                    },
                    target_lang: {
                        type: 'string',
                        description: 'The target language code (e.g., "fr" for French)'
                    },
                    api_key: {
                        type: 'string',
                        description: 'Optional Hugging Face API key'
                    }
                },
                required: ['text', 'target_lang']
            },
            async function(args) {
                const { 
                    model = 'Helsinki-NLP/opus-mt-en-fr', 
                    text, 
                    source_lang = 'en', 
                    target_lang,
                    api_key
                } = args;
                
                console.log(`HF Translation: ${model} from ${source_lang} to ${target_lang}: ${text}`);
                
                try {
                    // Update API key if provided
                    if (api_key) {
                        hfClient = window.HuggingFace.createClient(api_key);
                    }
                    
                    // In a real implementation with proper CORS setup, this would work
                    // For now, we'll simulate the response
                    
                    // Simulate API call delay
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Mock translations for demonstration
                    const translations = {
                        'fr': 'Ceci est une traduction simulée du texte en français.',
                        'es': 'Esta es una traducción simulada del texto al español.',
                        'de': 'Dies ist eine simulierte Übersetzung des Textes ins Deutsche.',
                        'it': 'Questa è una traduzione simulata del testo in italiano.',
                        'ja': 'これはテキストの日本語への模擬翻訳です。',
                        'zh': '这是文本的模拟中文翻译。'
                    };
                    
                    // Return simulated result
                    return {
                        model: model,
                        source_lang: source_lang,
                        target_lang: target_lang,
                        original_text: text,
                        translated_text: translations[target_lang] || `This is a simulated translation to ${target_lang}.`,
                        message: 'In a production environment with proper CORS setup, this would call the actual Hugging Face API.'
                    };
                } catch (error) {
                    console.error('Error calling Hugging Face API:', error);
                    return {
                        error: `Error translating text: ${error.message}`,
                        model: model
                    };
                }
            }
        );
        
        // Add mcp_translate tool as an alias for hf_translation
        StaticMcpServer.addTool(
            hfServer,
            'mcp_translate',
            'Translate text from one language to another using a Hugging Face translation model',
            {
                type: 'object',
                properties: {
                    server: {
                        type: 'string',
                        description: 'The server URL or model ID to use (e.g., "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-fr")'
                    },
                    inputs: {
                        type: 'object',
                        description: 'The input text to translate',
                        properties: {
                            text: {
                                type: 'string',
                                description: 'The text to translate'
                            }
                        },
                        required: ['text']
                    },
                    target_lang: {
                        type: 'string',
                        description: 'The target language code (e.g., "fr" for French)'
                    },
                    api_key: {
                        type: 'string',
                        description: 'Optional Hugging Face API key'
                    }
                },
                required: ['server', 'inputs']
            },
            async function(args) {
                const { server, inputs, target_lang = 'fr', api_key } = args;
                const text = inputs.text || (typeof inputs === 'string' ? inputs : JSON.stringify(inputs));
                
                console.log(`MCP Translate: ${server} with text: ${text} to ${target_lang}`);
                
                try {
                    // Update API key if provided
                    if (api_key) {
                        hfClient = window.HuggingFace.createClient(api_key);
                    }
                    
                    // Extract model ID from server URL if it's a URL
                    let model = server;
                    if (server.startsWith('http')) {
                        const match = server.match(/models\/([^\/]+)/);
                        if (match && match[1]) {
                            model = match[1];
                        }
                    }
                    
                    // In a real implementation with proper CORS setup, this would work
                    // For now, we'll simulate the response
                    
                    // Simulate API call delay
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Mock translations for demonstration
                    const translations = {
                        'fr': 'Ceci est une traduction simulée du texte en français.',
                        'es': 'Esta es una traducción simulada del texto al español.',
                        'de': 'Dies ist eine simulierte Übersetzung des Textes ins Deutsche.',
                        'it': 'Questa è una traduzione simulata del testo in italiano.',
                        'ja': 'これはテキストの日本語への模擬翻訳です。',
                        'zh': '这是文本的模拟中文翻译。'
                    };
                    
                    // Return simulated result
                    return {
                        model: model,
                        source_lang: 'en',
                        target_lang: target_lang,
                        original_text: text,
                        translated_text: translations[target_lang] || `This is a simulated translation to ${target_lang}.`,
                        message: 'In a production environment with proper CORS setup, this would call the actual Hugging Face API.'
                    };
                } catch (error) {
                    console.error('Error calling Hugging Face API:', error);
                    return {
                        error: `Error translating text: ${error.message}`,
                        model: server
                    };
                }
            }
        );
        
        // Register the server in the global registry
        if (typeof window.MCP_SERVER_REGISTRY === 'undefined') {
            window.MCP_SERVER_REGISTRY = {};
        }
        
        window.MCP_SERVER_REGISTRY['huggingface'] = hfServer;
        
        console.log('Hugging Face MCP server registered with tools: ' + hfServer.tools.map(t => t.name).join(', '));
    });
})();
