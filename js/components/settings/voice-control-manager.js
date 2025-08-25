/**
 * Voice Control Manager Module - Fresh Implementation
 * Minimal working foundation for voice recording functionality
 */

window.VoiceControlManager = (function() {
    function createVoiceControlManager(elements) {
        let microphoneState = 'idle'; // 'idle', 'recording', 'processing'
        let microphoneButton = null;
        let mediaRecorder = null;
        let audioChunks = [];
        let currentStream = null;
        
        function init() {
            console.log('🎤 VoiceControlManager: Starting fresh implementation');
            addVoiceControlCheckbox();
            initializeMicrophoneButton();
        }
        
        function addVoiceControlCheckbox() {
            const voiceControlContainer = document.createElement('div');
            voiceControlContainer.className = 'form-group';
            voiceControlContainer.style.marginTop = '10px';
            
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            const voiceControlCheckbox = document.createElement('input');
            voiceControlCheckbox.type = 'checkbox';
            voiceControlCheckbox.id = 'voice-control';
            voiceControlCheckbox.checked = getVoiceControlEnabled();
            
            const voiceControlLabel = document.createElement('label');
            voiceControlLabel.htmlFor = 'voice-control';
            voiceControlLabel.textContent = 'Microphone / Voice Control';
            
            const statusSpan = document.createElement('span');
            statusSpan.className = 'settings-item-status';
            statusSpan.id = 'voice-control-status';
            statusSpan.style.marginLeft = '10px';
            statusSpan.style.color = 'var(--text-color-secondary)';
            statusSpan.style.fontSize = '0.85em';
            statusSpan.style.fontWeight = 'normal';
            updateVoiceControlStatus(statusSpan, voiceControlCheckbox.checked);
            voiceControlLabel.appendChild(statusSpan);
            
            voiceControlCheckbox.addEventListener('change', function() {
                setVoiceControlEnabled(this.checked);
                toggleMicrophoneButton(this.checked);
                updateVoiceControlStatus(statusSpan, this.checked);
                
                if (window.DebugService) {
                    window.DebugService.debugLog('voice', 'Voice control ' + (this.checked ? 'enabled' : 'disabled'));
                }
            });
            
            checkboxGroup.appendChild(voiceControlCheckbox);
            checkboxGroup.appendChild(voiceControlLabel);
            voiceControlContainer.appendChild(checkboxGroup);
            
            const systemPromptSection = elements.openPromptsConfigBtn?.closest('.form-group');
            if (systemPromptSection && systemPromptSection.parentNode) {
                systemPromptSection.parentNode.insertBefore(voiceControlContainer, systemPromptSection.nextSibling);
            }
        }
        
        function initializeMicrophoneButton() {
            if (getVoiceControlEnabled()) {
                addMicrophoneButton();
            }
        }
        
        function addMicrophoneButton() {
            const chatForm = document.getElementById('chat-form');
            const messageInput = document.getElementById('message-input');
            
            if (!chatForm || !messageInput || microphoneButton) return;
            
            microphoneButton = document.createElement('button');
            microphoneButton.type = 'button';
            microphoneButton.id = 'microphone-btn';
            microphoneButton.className = 'microphone-btn';
            microphoneButton.title = 'Start voice recording';
            microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';
            
            if (messageInput && messageInput.nextSibling) {
                chatForm.insertBefore(microphoneButton, messageInput.nextSibling);
            } else {
                chatForm.appendChild(microphoneButton);
            }
            
            microphoneButton.addEventListener('click', toggleRecording);
        }
        
        function removeMicrophoneButton() {
            if (microphoneButton) {
                microphoneButton.remove();
                microphoneButton = null;
            }
        }
        
        function toggleMicrophoneButton(show) {
            if (show) {
                addMicrophoneButton();
            } else {
                if (microphoneState === 'recording') {
                    stopRecording();
                }
                removeMicrophoneButton();
            }
        }
        
        async function toggleRecording() {
            console.log('🎤 Toggle clicked, current state:', microphoneState);
            
            // Prevent clicks when processing
            if (microphoneState === 'processing') {
                console.log('🎤 Ignoring click - currently processing');
                return;
            }
            
            if (microphoneState === 'recording') {
                stopRecording();
            } else if (microphoneState === 'idle') {
                await startRecording();
            }
        }
        
        // PHASE 1: Absolute minimal recording implementation
        async function startRecording() {
            try {
                console.log('🎤 MINIMAL: Starting basic recording test...');
                microphoneState = 'recording';
                
                // Clean up any existing stream first
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                    currentStream = null;
                }
                
                // Phase 1: Most basic getUserMedia call possible
                console.log('🎤 MINIMAL: Requesting basic microphone access...');
                currentStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true 
                });
                
                console.log('🎤 MINIMAL: Stream created successfully');
                console.log('🎤 MINIMAL: Stream details:', {
                    active: currentStream.active,
                    audioTracks: currentStream.getAudioTracks().length,
                    trackEnabled: currentStream.getAudioTracks()[0]?.enabled,
                    trackReadyState: currentStream.getAudioTracks()[0]?.readyState
                });
                
                // Phase 1: Most basic MediaRecorder - no options at all
                console.log('🎤 MINIMAL: Creating basic MediaRecorder...');
                mediaRecorder = new MediaRecorder(currentStream);
                
                console.log('🎤 MINIMAL: MediaRecorder created with state:', mediaRecorder.state);
                console.log('🎤 MINIMAL: Default mimeType:', mediaRecorder.mimeType);
                
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    console.log('🎤 MINIMAL: Data received:', event.data.size, 'bytes');
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = async () => {
                    console.log('🎤 MINIMAL: Recording stopped, chunks:', audioChunks.length);
                    const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
                    console.log('🎤 MINIMAL: Total audio data:', totalSize, 'bytes');
                    
                    // Set processing state immediately after stopping
                    microphoneState = 'processing';
                    updateButtonState();
                    
                    if (totalSize > 0) {
                        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                        console.log('🎤 MINIMAL: Created blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
                        
                        // Process with Whisper API since basic recording works
                        if (audioBlob.size > 100) {
                            console.log('🎤 MINIMAL: Processing audio with Whisper API...');
                            await processAudioWithWhisper(audioBlob);
                        } else {
                            alert('Recording too small - might be silence');
                            microphoneState = 'idle';
                            updateButtonState();
                        }
                    } else {
                        alert('No audio data captured');
                        microphoneState = 'idle';
                        updateButtonState();
                    }
                    
                    // Clean up
                    if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                        currentStream = null;
                    }
                };
                
                mediaRecorder.onerror = (event) => {
                    console.error('🎤 MINIMAL: MediaRecorder error:', event.error);
                    alert('Recording error: ' + event.error.message);
                };
                
                // Start recording
                console.log('🎤 MINIMAL: Starting MediaRecorder...');
                mediaRecorder.start();
                
                // Update button to recording state
                updateButtonState();
                
                console.log('🎤 MINIMAL: Recording started successfully, state:', mediaRecorder.state);
                
            } catch (error) {
                console.error('🎤 MINIMAL: Error starting recording:', error);
                alert('Failed to start recording: ' + error.message);
                
                // Clean up on error
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                    currentStream = null;
                }
                microphoneState = 'idle';
                
                // Reset button
                updateButtonState();
            }
        }
        
        function stopRecording() {
            console.log('🎤 MINIMAL: Stopping recording...');
            
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                // Note: microphoneState will be set to 'processing' in the onstop handler
            }
        }
        
        // Auto-detect best Whisper model from available models
        async function selectBestWhisperModel() {
            try {
                // Try to get available models from the API
                const apiKey = window.StorageService?.getApiKey();
                const baseUrl = window.StorageService?.getBaseUrl() || 'https://api.openai.com/v1';
                
                if (!apiKey) {
                    return 'whisper-1'; // Default fallback
                }
                
                const response = await fetch(`${baseUrl}/models`, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const availableModels = data.data?.map(model => model.id) || [];
                    
                    // Find models containing "whisper" and rank them by preference
                    const whisperModels = availableModels.filter(model => 
                        model.toLowerCase().includes('whisper')
                    );
                    
                    console.log('🎤 Available Whisper models:', whisperModels);
                    
                    // Preference order: large > medium > small > base > general
                    const preferenceOrder = [
                        'whisper-large-v3-turbo',
                        'whisper-large-v3', 
                        'distil-whisper-large-v3-en',
                        'whisper-large',
                        'whisper-medium',
                        'whisper-small', 
                        'whisper-base',
                        'whisper-1'
                    ];
                    
                    // Find the first available model in preference order
                    for (const preferred of preferenceOrder) {
                        if (whisperModels.includes(preferred)) {
                            console.log('🎤 Selected preferred model:', preferred);
                            return preferred;
                        }
                    }
                    
                    // If no preferred model found, use the first whisper model available
                    if (whisperModels.length > 0) {
                        console.log('🎤 Selected first available whisper model:', whisperModels[0]);
                        return whisperModels[0];
                    }
                }
            } catch (error) {
                console.warn('🎤 Failed to fetch models for whisper selection:', error);
            }
            
            // Ultimate fallback
            console.log('🎤 Using fallback model: whisper-1');
            return 'whisper-1';
        }

        // Auto-detect provider and configure appropriate Whisper settings
        function detectWhisperProvider(baseUrl) {
            const url = baseUrl.toLowerCase();
            
            if (url.includes('groq.com')) {
                return {
                    name: 'GroqCloud',
                    endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions'
                };
            } else if (url.includes('berget.ai')) {
                return {
                    name: 'Berget.ai',
                    endpoint: 'https://api.berget.ai/v1/audio/transcriptions'
                };
            } else if (url.includes('openai.com')) {
                return {
                    name: 'OpenAI',
                    endpoint: 'https://api.openai.com/v1/audio/transcriptions'
                };
            } else {
                // Default to OpenAI-compatible format for unknown providers
                return {
                    name: 'OpenAI-Compatible',
                    endpoint: `${baseUrl}/audio/transcriptions`
                };
            }
        }

        // Process audio with Whisper API with auto-provider detection
        async function processAudioWithWhisper(audioBlob) {
            try {
                // Get API configuration
                const apiKey = window.StorageService?.getApiKey();
                const baseUrl = window.StorageService?.getBaseUrl() || 'https://api.openai.com/v1';
                
                if (!apiKey) {
                    alert('Please configure your API key to use voice control.');
                    return;
                }
                
                // Auto-detect provider and get appropriate configuration
                const providerConfig = detectWhisperProvider(baseUrl);
                
                // Select best available Whisper model
                const selectedModel = await selectBestWhisperModel();
                
                console.log('🎤 Auto-detected provider:', providerConfig.name);
                console.log('🎤 Using endpoint:', providerConfig.endpoint);
                console.log('🎤 Selected model:', selectedModel);
                
                console.log('🎤 MINIMAL: Sending to Whisper API...', {
                    size: audioBlob.size,
                    type: audioBlob.type,
                    provider: providerConfig.name,
                    endpoint: providerConfig.endpoint,
                    model: selectedModel
                });
                
                // Create form data
                const formData = new FormData();
                
                // Determine file name based on MIME type
                let fileName = 'recording.webm';
                if (audioBlob.type.includes('mp4')) {
                    fileName = 'recording.m4a';
                } else if (audioBlob.type.includes('ogg')) {
                    fileName = 'recording.ogg';
                } else if (audioBlob.type.includes('wav')) {
                    fileName = 'recording.wav';
                }
                
                formData.append('file', audioBlob, fileName);
                formData.append('model', selectedModel);
                
                // Send to provider-specific endpoint
                const response = await fetch(providerConfig.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: formData
                });
                
                console.log('🎤 MINIMAL: Whisper API response:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('🎤 API Error Response:', errorText);
                    throw new Error(`${providerConfig.name} API error: ${response.status} ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('🎤 MINIMAL: Transcription result:', result);
                
                if (result.text) {
                    console.log('🎤 MINIMAL: Transcribed text:', `"${result.text}"`);
                    
                    // Insert into message input
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        const currentText = messageInput.value;
                        if (currentText && !currentText.endsWith(' ')) {
                            messageInput.value = currentText + ' ' + result.text;
                        } else {
                            messageInput.value = currentText + result.text;
                        }
                        
                        // Trigger input event
                        messageInput.dispatchEvent(new Event('input'));
                        messageInput.focus();
                        
                        console.log('🎤 MINIMAL: Text inserted successfully');
                        
                        if (window.DebugService) {
                            window.DebugService.debugLog('voice', `Transcribed: "${result.text}" (${result.text.length} chars)`);
                        }
                    }
                } else {
                    console.warn('🎤 MINIMAL: No text in API response');
                    alert('No speech was detected in the recording.');
                }
                
            } catch (error) {
                console.error('🎤 MINIMAL: Whisper API error:', error);
                alert('Failed to transcribe audio: ' + error.message);
            } finally {
                // Always reset to idle state when processing is complete
                microphoneState = 'idle';
                updateButtonState();
                console.log('🎤 MINIMAL: Processing complete, state reset to idle');
            }
        }
        
        /**
         * Update the microphone button appearance based on current state
         */
        function updateButtonState() {
            if (!microphoneButton) return;
            
            // Remove all existing classes
            microphoneButton.classList.remove('recording', 'processing');
            
            switch (microphoneState) {
                case 'idle':
                    microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';
                    microphoneButton.title = 'Start voice recording';
                    microphoneButton.style.cursor = 'pointer';
                    break;
                    
                case 'recording':
                    microphoneButton.classList.add('recording');
                    microphoneButton.innerHTML = `
                        <div class="sound-bars">
                            <div class="sound-bar"></div>
                            <div class="sound-bar"></div>
                            <div class="sound-bar"></div>
                        </div>
                    `;
                    microphoneButton.title = 'Stop recording';
                    microphoneButton.style.cursor = 'pointer';
                    break;
                    
                case 'processing':
                    microphoneButton.classList.add('processing');
                    microphoneButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    microphoneButton.title = 'Processing audio...';
                    microphoneButton.style.cursor = 'not-allowed';
                    break;
            }
            
            console.log('🎤 Button state updated to:', microphoneState);
        }
        
        function getVoiceControlEnabled() {
            const stored = localStorage.getItem('voice_control_enabled');
            return stored === 'true';
        }
        
        function setVoiceControlEnabled(enabled) {
            localStorage.setItem('voice_control_enabled', enabled ? 'true' : 'false');
        }
        
        function updateVoiceControlStatus(statusSpan, enabled) {
            if (!enabled) {
                statusSpan.textContent = '(Disabled)';
                return;
            }
            
            // Get current base URL and detect provider
            const baseUrl = window.StorageService?.getBaseUrl() || 'https://api.openai.com/v1';
            const providerConfig = detectWhisperProvider(baseUrl);
            
            statusSpan.textContent = `(Enabled, auto-detected: ${providerConfig.name})`;
        }

        function getVoiceControlStatus() {
            const enabled = getVoiceControlEnabled();
            if (!enabled) return 'Disabled';
            
            const baseUrl = window.StorageService?.getBaseUrl() || 'https://api.openai.com/v1';
            const providerConfig = detectWhisperProvider(baseUrl);
            return `Enabled (auto-detected: ${providerConfig.name})`;
        }
        
        return {
            init,
            getVoiceControlStatus,
            getVoiceControlEnabled
        };
    }

    return {
        createVoiceControlManager
    };
})();