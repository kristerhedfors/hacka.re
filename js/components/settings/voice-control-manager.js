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
        let recordingStartTime = null; // Track when recording starts
        
        // Performance tracking
        const perfLogger = window.PerformanceLogger ? new window.PerformanceLogger('🎤 Voice') : null;
        const performanceMetrics = {
            recordingStartTime: 0,
            recordingEndTime: 0,
            processingStartTime: 0,
            processingEndTime: 0,
            whisperRequestStartTime: 0,
            whisperResponseTime: 0,
            transcriptionStartTime: 0,
            transcriptionEndTime: 0,
            totalAudioBytes: 0,
            totalChunks: 0,
            streamAcquisitionTime: 0,
            recorderCreationTime: 0,
            failures: [],
            successCount: 0,
            failureCount: 0,
            averageProcessingTime: 0,
            lastProcessingSpeed: 0
        };
        
        // Track performance over time
        const performanceHistory = [];
        const MAX_HISTORY_SIZE = 50;
        
        function init() {
            console.log('🎤 VoiceControlManager: Starting fresh implementation');
            if (perfLogger) {
                perfLogger.reset();
                perfLogger.log('VoiceControlManager initialization started');
            }
            addVoiceControlCheckbox();
            initializeMicrophoneButton();
            if (perfLogger) {
                perfLogger.log('VoiceControlManager initialization complete');
            }
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
            
            // Create a wrapper for the input and microphone button
            let inputWrapper = document.getElementById('message-input-wrapper');
            if (!inputWrapper) {
                inputWrapper = document.createElement('div');
                inputWrapper.id = 'message-input-wrapper';
                inputWrapper.className = 'message-input-wrapper';
                
                // Move the message input into the wrapper
                messageInput.parentNode.insertBefore(inputWrapper, messageInput);
                inputWrapper.appendChild(messageInput);
            }
            
            microphoneButton = document.createElement('button');
            microphoneButton.type = 'button';
            microphoneButton.id = 'microphone-btn';
            microphoneButton.className = 'microphone-btn-inside';
            microphoneButton.title = 'Start voice recording';
            microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';
            
            // Add microphone button inside the wrapper
            inputWrapper.appendChild(microphoneButton);
            
            microphoneButton.addEventListener('click', toggleRecording);
            
            // Add input listener to hide/show microphone based on content
            messageInput.addEventListener('input', handleInputChange);
            messageInput.addEventListener('keyup', handleInputChange);
            messageInput.addEventListener('change', handleInputChange);
            messageInput.addEventListener('focus', handleInputChange);
            messageInput.addEventListener('blur', handleInputChange);
            
            // Also listen for form submission to show microphone after sending
            if (chatForm) {
                chatForm.addEventListener('submit', function() {
                    // Show microphone again after message is sent (with a small delay)
                    setTimeout(handleInputChange, 100);
                });
            }
            
            // Initial check
            handleInputChange();
        }
        
        function handleInputChange() {
            const messageInput = document.getElementById('message-input');
            // Always query the DOM for the current button
            const currentMicButton = document.querySelector('.microphone-btn-inside');
            
            if (!messageInput || !currentMicButton) return;
            
            const hasText = messageInput.value.trim().length > 0;
            
            // Hide microphone if there's text, show if empty and not recording
            if (hasText) {
                currentMicButton.style.display = 'none';
            } else if (microphoneState !== 'recording' && microphoneState !== 'processing') {
                currentMicButton.style.display = 'flex';
            }
        }
        
        function removeMicrophoneButton() {
            if (microphoneButton) {
                microphoneButton.remove();
                microphoneButton = null;
            }
            
            // Clean up wrapper and restore original structure
            const inputWrapper = document.getElementById('message-input-wrapper');
            const messageInput = document.getElementById('message-input');
            
            if (inputWrapper && messageInput) {
                // Remove event listeners
                messageInput.removeEventListener('input', handleInputChange);
                messageInput.removeEventListener('focus', handleInputChange);
                messageInput.removeEventListener('blur', handleInputChange);
                
                // Move message input back to its original position
                const chatForm = document.getElementById('chat-form');
                if (chatForm && inputWrapper.parentNode === chatForm) {
                    chatForm.insertBefore(messageInput, inputWrapper);
                    inputWrapper.remove();
                }
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
                if (perfLogger) {
                    perfLogger.reset();
                    perfLogger.log('Starting recording sequence');
                }
                
                console.log('🎤 MINIMAL: Starting basic recording test...');
                microphoneState = 'recording';
                recordingStartTime = Date.now(); // Track when recording starts
                performanceMetrics.recordingStartTime = performance.now();
                
                // Clean up any existing stream first
                if (currentStream) {
                    if (perfLogger) perfLogger.log('Cleaning up existing stream');
                    currentStream.getTracks().forEach(track => track.stop());
                    currentStream = null;
                }
                
                // Phase 1: Most basic getUserMedia call possible
                console.log('🎤 MINIMAL: Requesting basic microphone access...');
                if (perfLogger) perfLogger.log('Requesting getUserMedia');
                const streamStartTime = performance.now();
                
                currentStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true 
                });
                
                performanceMetrics.streamAcquisitionTime = performance.now() - streamStartTime;
                if (perfLogger) perfLogger.log(`Stream acquired in ${performanceMetrics.streamAcquisitionTime.toFixed(1)}ms`);
                
                console.log('🎤 MINIMAL: Stream created successfully');
                console.log('🎤 MINIMAL: Stream details:', {
                    active: currentStream.active,
                    audioTracks: currentStream.getAudioTracks().length,
                    trackEnabled: currentStream.getAudioTracks()[0]?.enabled,
                    trackReadyState: currentStream.getAudioTracks()[0]?.readyState
                });
                
                // Phase 1: Most basic MediaRecorder - no options at all
                console.log('🎤 MINIMAL: Creating basic MediaRecorder...');
                if (perfLogger) perfLogger.log('Creating MediaRecorder');
                const recorderStartTime = performance.now();
                
                mediaRecorder = new MediaRecorder(currentStream);
                
                performanceMetrics.recorderCreationTime = performance.now() - recorderStartTime;
                if (perfLogger) perfLogger.log(`MediaRecorder created in ${performanceMetrics.recorderCreationTime.toFixed(1)}ms`);
                
                console.log('🎤 MINIMAL: MediaRecorder created with state:', mediaRecorder.state);
                console.log('🎤 MINIMAL: Default mimeType:', mediaRecorder.mimeType);
                
                audioChunks = [];
                performanceMetrics.totalChunks = 0;
                performanceMetrics.totalAudioBytes = 0;
                
                mediaRecorder.ondataavailable = (event) => {
                    console.log('🎤 MINIMAL: Data received:', event.data.size, 'bytes');
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                        performanceMetrics.totalChunks++;
                        performanceMetrics.totalAudioBytes += event.data.size;
                        if (perfLogger) perfLogger.log(`Data chunk ${performanceMetrics.totalChunks}: ${event.data.size} bytes`);
                    }
                };
                
                mediaRecorder.onstop = async () => {
                    performanceMetrics.recordingEndTime = performance.now();
                    const recordingDuration = performanceMetrics.recordingEndTime - performanceMetrics.recordingStartTime;
                    
                    if (perfLogger) perfLogger.log(`Recording stopped after ${recordingDuration.toFixed(1)}ms`);
                    
                    console.log('🎤 MINIMAL: Recording stopped, chunks:', audioChunks.length);
                    const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
                    console.log('🎤 MINIMAL: Total audio data:', totalSize, 'bytes');
                    
                    if (perfLogger) {
                        perfLogger.log(`Total chunks: ${performanceMetrics.totalChunks}`);
                        perfLogger.log(`Total bytes: ${performanceMetrics.totalAudioBytes}`);
                        perfLogger.log(`Bytes/second: ${(performanceMetrics.totalAudioBytes / (recordingDuration / 1000)).toFixed(0)}`);
                    }
                    
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
                    
                    // Stream cleanup already done in stopRecording()
                };
                
                mediaRecorder.onerror = (event) => {
                    console.error('🎤 MINIMAL: MediaRecorder error:', event.error);
                    alert('Recording error: ' + event.error.message);
                };
                
                // Start recording
                console.log('🎤 MINIMAL: Starting MediaRecorder...');
                if (perfLogger) perfLogger.log('Starting MediaRecorder');
                mediaRecorder.start();
                
                // Update button to recording state
                updateButtonState();
                
                if (perfLogger) perfLogger.log('Recording started successfully');
                console.log('🎤 MINIMAL: Recording started successfully, state:', mediaRecorder.state);
                
            } catch (error) {
                performanceMetrics.failureCount++;
                performanceMetrics.failures.push({
                    timestamp: Date.now(),
                    error: error.message,
                    phase: 'start_recording'
                });
                
                if (perfLogger) perfLogger.log(`Recording start failed: ${error.message}`);
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
            
            // IMPORTANT: Stop the media stream immediately to turn off microphone
            if (currentStream) {
                console.log('🎤 Stopping media stream tracks...');
                currentStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('🎤 Track stopped:', track.label);
                });
                currentStream = null;
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
                performanceMetrics.processingStartTime = performance.now();
                if (perfLogger) {
                    perfLogger.log('Starting Whisper processing');
                    perfLogger.log(`Audio blob size: ${audioBlob.size} bytes`);
                }
                
                // Get API configuration
                const apiKey = window.StorageService?.getApiKey();
                const baseUrl = window.StorageService?.getBaseUrl() || 'https://api.openai.com/v1';
                
                if (!apiKey) {
                    alert('Please configure your API key to use voice control.');
                    performanceMetrics.failureCount++;
                    performanceMetrics.failures.push({
                        timestamp: Date.now(),
                        error: 'No API key',
                        phase: 'whisper_processing'
                    });
                    return;
                }
                
                // Auto-detect provider and get appropriate configuration
                const providerConfig = detectWhisperProvider(baseUrl);
                if (perfLogger) perfLogger.log(`Provider detected: ${providerConfig.name}`);
                
                // Select best available Whisper model
                const modelSelectionStart = performance.now();
                const selectedModel = await selectBestWhisperModel();
                const modelSelectionTime = performance.now() - modelSelectionStart;
                if (perfLogger) perfLogger.log(`Model selected: ${selectedModel} (${modelSelectionTime.toFixed(1)}ms)`);
                
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
                performanceMetrics.whisperRequestStartTime = performance.now();
                if (perfLogger) perfLogger.log(`Sending request to ${providerConfig.name}`);
                
                const response = await fetch(providerConfig.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: formData
                });
                
                performanceMetrics.whisperResponseTime = performance.now();
                const apiCallDuration = performanceMetrics.whisperResponseTime - performanceMetrics.whisperRequestStartTime;
                if (perfLogger) perfLogger.log(`API response received in ${apiCallDuration.toFixed(1)}ms (status: ${response.status})`);
                
                console.log('🎤 MINIMAL: Whisper API response:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('🎤 API Error Response:', errorText);
                    performanceMetrics.failureCount++;
                    performanceMetrics.failures.push({
                        timestamp: Date.now(),
                        error: `API ${response.status}`,
                        phase: 'whisper_api_call',
                        duration: apiCallDuration
                    });
                    throw new Error(`${providerConfig.name} API error: ${response.status} ${response.statusText}`);
                }
                
                performanceMetrics.transcriptionStartTime = performance.now();
                const result = await response.json();
                performanceMetrics.transcriptionEndTime = performance.now();
                
                if (perfLogger) {
                    const parseTime = performanceMetrics.transcriptionEndTime - performanceMetrics.transcriptionStartTime;
                    perfLogger.log(`Response parsed in ${parseTime.toFixed(1)}ms`);
                }
                
                console.log('🎤 MINIMAL: Transcription result:', result);
                
                if (result.text) {
                    console.log('🎤 MINIMAL: Transcribed text:', `"${result.text}"`);
                    
                    // Calculate comprehensive performance metrics
                    performanceMetrics.processingEndTime = performance.now();
                    const totalProcessingTime = performanceMetrics.processingEndTime - performanceMetrics.processingStartTime;
                    const recordingDuration = (performanceMetrics.recordingEndTime - performanceMetrics.recordingStartTime) / 1000; // seconds
                    const processingSpeed = recordingDuration / (totalProcessingTime / 1000); // x realtime speed
                    
                    // Track performance history
                    performanceMetrics.lastProcessingSpeed = processingSpeed;
                    performanceMetrics.successCount++;
                    
                    // Add to history for trend analysis
                    performanceHistory.push({
                        timestamp: Date.now(),
                        recordingDuration: recordingDuration,
                        processingTime: totalProcessingTime,
                        processingSpeed: processingSpeed,
                        audioBytes: performanceMetrics.totalAudioBytes,
                        apiCallTime: performanceMetrics.whisperResponseTime - performanceMetrics.whisperRequestStartTime,
                        streamAcquisitionTime: performanceMetrics.streamAcquisitionTime
                    });
                    
                    // Keep history size limited
                    if (performanceHistory.length > MAX_HISTORY_SIZE) {
                        performanceHistory.shift();
                    }
                    
                    // Calculate average processing speed from recent history
                    const recentHistory = performanceHistory.slice(-10);
                    const avgSpeed = recentHistory.reduce((sum, h) => sum + h.processingSpeed, 0) / recentHistory.length;
                    performanceMetrics.averageProcessingTime = avgSpeed;
                    
                    // Detect performance degradation
                    let degradationWarning = '';
                    if (performanceHistory.length >= 3) {
                        const lastThree = performanceHistory.slice(-3);
                        const speedTrend = lastThree.map(h => h.processingSpeed);
                        if (speedTrend[2] < speedTrend[0] * 0.7) {
                            degradationWarning = ' ⚠️ Performance degrading';
                        }
                    }
                    
                    // Calculate words per second
                    const words = result.text.trim().split(/\s+/).filter(word => word.length > 0);
                    const wordCount = words.length;
                    const wordsPerSecond = recordingDuration > 0 ? (wordCount / recordingDuration) : 0;
                    
                    // Display enhanced system message with processing speed
                    const metricsMessage = `🎤 Recording: ${recordingDuration.toFixed(1)}s | Speed: ${processingSpeed.toFixed(2)}x realtime | ${wordsPerSecond.toFixed(2)} words/sec${degradationWarning}`;
                    console.log('🎤 MINIMAL: Performance metrics:', metricsMessage);
                    
                    if (perfLogger) {
                        perfLogger.log(`Total processing time: ${totalProcessingTime.toFixed(1)}ms`);
                        perfLogger.log(`Processing speed: ${processingSpeed.toFixed(2)}x realtime`);
                        perfLogger.log(`Success rate: ${performanceMetrics.successCount}/${performanceMetrics.successCount + performanceMetrics.failureCount}`);
                        if (degradationWarning) {
                            perfLogger.log(`Performance degradation detected!`);
                        }
                    }
                    
                    // Try to add system message using the global aiHackare object
                    if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                        console.log('🎤 MINIMAL: Adding system message via aiHackare.chatManager');
                        window.aiHackare.chatManager.addSystemMessage(metricsMessage);
                    } else if (window.ChatManager && window.ChatManager.addSystemMessage) {
                        console.log('🎤 MINIMAL: Adding system message via window.ChatManager');
                        window.ChatManager.addSystemMessage(metricsMessage);
                    } else {
                        console.log('🎤 MINIMAL: ChatManager not found, cannot display system message');
                        console.log('🎤 MINIMAL: Available:', {
                            'window.ChatManager': !!window.ChatManager,
                            'window.aiHackare': !!window.aiHackare,
                            'window.aiHackare.chatManager': !!(window.aiHackare && window.aiHackare.chatManager)
                        });
                    }
                    
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
                    performanceMetrics.failureCount++;
                    performanceMetrics.failures.push({
                        timestamp: Date.now(),
                        error: 'No text in response',
                        phase: 'whisper_transcription'
                    });
                    
                    if (perfLogger) {
                        perfLogger.log('Transcription failed: No text detected');
                        perfLogger.log(`Failure rate: ${performanceMetrics.failureCount}/${performanceMetrics.successCount + performanceMetrics.failureCount}`);
                    }
                    alert('No speech was detected in the recording.');
                }
                
            } catch (error) {
                performanceMetrics.failureCount++;
                const processingTime = performance.now() - performanceMetrics.processingStartTime;
                performanceMetrics.failures.push({
                    timestamp: Date.now(),
                    error: error.message,
                    phase: 'whisper_processing',
                    duration: processingTime
                });
                
                if (perfLogger) {
                    perfLogger.log(`Whisper API error after ${processingTime.toFixed(1)}ms: ${error.message}`);
                    perfLogger.log(`Total failures: ${performanceMetrics.failureCount}`);
                    
                    // Log recent failure pattern if multiple failures
                    if (performanceMetrics.failures.length >= 3) {
                        const recentFailures = performanceMetrics.failures.slice(-3);
                        perfLogger.log('Recent failure pattern:');
                        recentFailures.forEach(f => {
                            perfLogger.log(`  - ${f.phase}: ${f.error}`);
                        });
                    }
                }
                
                console.error('🎤 MINIMAL: Whisper API error:', error);
                alert('Failed to transcribe audio: ' + error.message);
            } finally {
                // Always reset to idle state when processing is complete
                microphoneState = 'idle';
                updateButtonState();
                
                if (perfLogger) {
                    const totalTime = performance.now() - (performanceMetrics.recordingStartTime || 0);
                    perfLogger.log(`Session complete. Total time: ${totalTime.toFixed(1)}ms`);
                    perfLogger.log(`Final state: ${microphoneState}`);
                }
                
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
                    // Check if we should show the button
                    handleInputChange();
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
                    // Don't force display - let handleInputChange manage visibility
                    break;
                    
                case 'processing':
                    microphoneButton.classList.add('processing');
                    microphoneButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    microphoneButton.title = 'Processing audio...';
                    microphoneButton.style.cursor = 'not-allowed';
                    // Don't force display - let handleInputChange manage visibility
                    break;
            }
            
            console.log('🎤 Button state updated to:', microphoneState);
            
            // After updating button state, check if it should be visible based on input content
            // Force re-check to ensure proper visibility
            setTimeout(handleInputChange, 0);
        }
        
        function getVoiceControlEnabled() {
            // Use CoreStorageService for namespaced, encrypted storage
            if (window.CoreStorageService) {
                return window.CoreStorageService.getValue('voice_control_enabled') === true;
            }
            // Fallback for initialization
            return false;
        }
        
        function setVoiceControlEnabled(enabled) {
            // Use CoreStorageService for namespaced, encrypted storage
            if (window.CoreStorageService) {
                window.CoreStorageService.setValue('voice_control_enabled', enabled);
            }
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
        
        /**
         * Get performance diagnostics for debugging
         * @returns {Object} Performance metrics and history
         */
        function getPerformanceDiagnostics() {
            const diagnostics = {
                currentMetrics: performanceMetrics,
                history: performanceHistory,
                statistics: {
                    totalSessions: performanceMetrics.successCount + performanceMetrics.failureCount,
                    successRate: performanceMetrics.successCount / (performanceMetrics.successCount + performanceMetrics.failureCount) || 0,
                    averageSpeed: performanceMetrics.averageProcessingTime,
                    lastSpeed: performanceMetrics.lastProcessingSpeed,
                    recentFailures: performanceMetrics.failures.slice(-5)
                }
            };
            
            // Calculate performance trends if enough history
            if (performanceHistory.length >= 5) {
                const recent = performanceHistory.slice(-5);
                diagnostics.statistics.recentTrend = {
                    avgProcessingTime: recent.reduce((sum, h) => sum + h.processingTime, 0) / recent.length,
                    avgApiCallTime: recent.reduce((sum, h) => sum + h.apiCallTime, 0) / recent.length,
                    avgSpeed: recent.reduce((sum, h) => sum + h.processingSpeed, 0) / recent.length
                };
            }
            
            return diagnostics;
        }
        
        /**
         * Reset performance metrics (useful for testing)
         */
        function resetPerformanceMetrics() {
            performanceMetrics.successCount = 0;
            performanceMetrics.failureCount = 0;
            performanceMetrics.failures = [];
            performanceMetrics.averageProcessingTime = 0;
            performanceMetrics.lastProcessingSpeed = 0;
            performanceHistory.length = 0;
            if (perfLogger) {
                perfLogger.reset();
                perfLogger.log('Performance metrics reset');
            }
        }
        
        return {
            init,
            getVoiceControlStatus,
            getVoiceControlEnabled,
            getPerformanceDiagnostics,
            resetPerformanceMetrics
        };
    }

    return {
        createVoiceControlManager
    };
})();