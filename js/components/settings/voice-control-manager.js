/**
 * Voice Control Manager Module
 * Handles voice control functionality for the Settings modal
 * Provides microphone input and voice-to-text capabilities
 */

window.VoiceControlManager = (function() {
    /**
     * Create a Voice Control Manager instance
     * @param {Object} elements - DOM elements
     * @returns {Object} Voice Control Manager instance
     */
    function createVoiceControlManager(elements) {
        let isRecording = false;
        let microphoneButton = null;
        let mediaRecorder = null;
        let audioChunks = [];
        
        /**
         * Initialize the voice control manager
         */
        function init() {
            // Add voice control checkbox after debug mode controls
            addVoiceControlCheckbox();
            // Initialize microphone button
            initializeMicrophoneButton();
        }
        
        /**
         * Add voice control checkbox to the settings form
         */
        function addVoiceControlCheckbox() {
            // Create the voice control container
            const voiceControlContainer = document.createElement('div');
            voiceControlContainer.className = 'form-group';
            voiceControlContainer.style.marginTop = '10px';
            
            // Create the checkbox group
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            // Create the checkbox input
            const voiceControlCheckbox = document.createElement('input');
            voiceControlCheckbox.type = 'checkbox';
            voiceControlCheckbox.id = 'voice-control';
            voiceControlCheckbox.checked = getVoiceControlEnabled();
            
            // Create the label
            const voiceControlLabel = document.createElement('label');
            voiceControlLabel.htmlFor = 'voice-control';
            voiceControlLabel.textContent = 'Microphone / Voice Control';
            
            // Add status text
            const statusSpan = document.createElement('span');
            statusSpan.className = 'settings-item-status';
            statusSpan.style.marginLeft = '10px';
            statusSpan.style.color = 'var(--text-color-secondary)';
            statusSpan.style.fontSize = '0.85em';
            statusSpan.style.fontWeight = 'normal';
            statusSpan.textContent = voiceControlCheckbox.checked ? '(Enabled, using Whisper API)' : '(Disabled)';
            voiceControlLabel.appendChild(statusSpan);
            
            // Add event listener to the checkbox
            voiceControlCheckbox.addEventListener('change', function() {
                setVoiceControlEnabled(this.checked);
                toggleMicrophoneButton(this.checked);
                
                // Update status text
                statusSpan.textContent = this.checked ? '(Enabled, using Whisper API)' : '(Disabled)';
                
                if (window.DebugService) {
                    window.DebugService.log('Voice control ' + (this.checked ? 'enabled' : 'disabled'), 'VOICE');
                }
            });
            
            // Append elements to the checkbox group
            checkboxGroup.appendChild(voiceControlCheckbox);
            checkboxGroup.appendChild(voiceControlLabel);
            voiceControlContainer.appendChild(checkboxGroup);
            
            // Find the system prompt section to insert after (Voice Control will be first after system prompt)
            const systemPromptSection = elements.openPromptsConfigBtn?.closest('.form-group');
            if (systemPromptSection && systemPromptSection.parentNode) {
                systemPromptSection.parentNode.insertBefore(voiceControlContainer, systemPromptSection.nextSibling);
            }
        }
        
        /**
         * Initialize the microphone button in the input field
         */
        function initializeMicrophoneButton() {
            // Check if voice control is enabled
            if (getVoiceControlEnabled()) {
                addMicrophoneButton();
            }
        }
        
        /**
         * Add microphone button to the input field
         */
        function addMicrophoneButton() {
            const chatForm = document.getElementById('chat-form');
            const messageInput = document.getElementById('message-input');
            
            if (!chatForm || !messageInput || microphoneButton) return;
            
            // Create microphone button
            microphoneButton = document.createElement('button');
            microphoneButton.type = 'button';
            microphoneButton.id = 'microphone-btn';
            microphoneButton.className = 'microphone-btn';
            microphoneButton.title = 'Start voice recording';
            microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';
            
            // Insert microphone button after the message input (but before send button)
            if (messageInput && messageInput.nextSibling) {
                chatForm.insertBefore(microphoneButton, messageInput.nextSibling);
            } else {
                chatForm.appendChild(microphoneButton);
            }
            
            // Add click event listener
            microphoneButton.addEventListener('click', toggleRecording);
        }
        
        /**
         * Remove microphone button from the input field
         */
        function removeMicrophoneButton() {
            if (microphoneButton) {
                microphoneButton.remove();
                microphoneButton = null;
            }
        }
        
        /**
         * Toggle microphone button visibility
         * @param {boolean} show - Whether to show or hide the button
         */
        function toggleMicrophoneButton(show) {
            if (show) {
                addMicrophoneButton();
            } else {
                // Stop recording if active
                if (isRecording) {
                    stopRecording();
                }
                removeMicrophoneButton();
            }
        }
        
        /**
         * Toggle recording state
         */
        async function toggleRecording() {
            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        }
        
        /**
         * Start voice recording
         */
        async function startRecording() {
            try {
                // Request microphone permission
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Create media recorder
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = async () => {
                    // Create audio blob
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    
                    // Process audio (send to Whisper API or similar)
                    await processAudio(audioBlob);
                    
                    // Clean up
                    stream.getTracks().forEach(track => track.stop());
                };
                
                // Start recording
                mediaRecorder.start();
                isRecording = true;
                
                // Update button appearance
                if (microphoneButton) {
                    microphoneButton.classList.add('recording');
                    microphoneButton.innerHTML = '<i class="fas fa-stop"></i>';
                    microphoneButton.title = 'Stop recording';
                }
                
                if (window.DebugService) {
                    window.DebugService.log('Voice recording started', 'VOICE');
                }
                
            } catch (error) {
                console.error('Error starting recording:', error);
                alert('Failed to access microphone. Please check your permissions.');
            }
        }
        
        /**
         * Stop voice recording
         */
        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                
                // Update button appearance
                if (microphoneButton) {
                    microphoneButton.classList.remove('recording');
                    microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';
                    microphoneButton.title = 'Start voice recording';
                }
                
                if (window.DebugService) {
                    window.DebugService.log('Voice recording stopped', 'VOICE');
                }
            }
        }
        
        /**
         * Process recorded audio
         * @param {Blob} audioBlob - The recorded audio blob
         */
        async function processAudio(audioBlob) {
            try {
                // Get API key and base URL
                const apiKey = window.StorageService?.getApiKey();
                const baseUrl = window.StorageService?.getBaseUrl() || 'https://api.openai.com/v1';
                
                if (!apiKey) {
                    alert('Please configure your API key to use voice control.');
                    return;
                }
                
                // Create form data for Whisper API
                const formData = new FormData();
                formData.append('file', audioBlob, 'recording.webm');
                formData.append('model', 'whisper-1');
                
                // Send to Whisper API
                const response = await fetch(`${baseUrl}/audio/transcriptions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`API responded with status ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.text) {
                    // Insert transcribed text into message input
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        // Append to existing text with a space if needed
                        const currentText = messageInput.value;
                        if (currentText && !currentText.endsWith(' ')) {
                            messageInput.value = currentText + ' ' + result.text;
                        } else {
                            messageInput.value = currentText + result.text;
                        }
                        
                        // Trigger input event for any listeners
                        messageInput.dispatchEvent(new Event('input'));
                        
                        // Focus the input
                        messageInput.focus();
                    }
                    
                    if (window.DebugService) {
                        window.DebugService.log(`Transcribed text: ${result.text}`, 'VOICE');
                    }
                }
                
            } catch (error) {
                console.error('Error processing audio:', error);
                alert('Failed to transcribe audio. Please check your API configuration and ensure Whisper API is available.');
            }
        }
        
        /**
         * Get voice control enabled state from storage
         * @returns {boolean} Whether voice control is enabled
         */
        function getVoiceControlEnabled() {
            const stored = localStorage.getItem('voice_control_enabled');
            return stored === 'true';
        }
        
        /**
         * Set voice control enabled state in storage
         * @param {boolean} enabled - Whether voice control should be enabled
         */
        function setVoiceControlEnabled(enabled) {
            localStorage.setItem('voice_control_enabled', enabled ? 'true' : 'false');
        }
        
        /**
         * Get voice control status for display
         * @returns {string} Status text for voice control
         */
        function getVoiceControlStatus() {
            const enabled = getVoiceControlEnabled();
            if (enabled) {
                return 'Enabled (using Whisper API)';
            }
            return 'Disabled';
        }
        
        // Public API
        return {
            init,
            getVoiceControlStatus,
            getVoiceControlEnabled
        };
    }

    // Public API
    return {
        createVoiceControlManager
    };
})();