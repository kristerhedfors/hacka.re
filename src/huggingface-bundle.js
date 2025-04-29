// Import the Hugging Face inference library
import { InferenceClient } from '@huggingface/inference';

// Export the library as a global variable
window.HuggingFace = {
  InferenceClient,
  
  // Create a client instance with the given API key
  createClient: function(apiKey) {
    return new InferenceClient(apiKey);
  }
};
