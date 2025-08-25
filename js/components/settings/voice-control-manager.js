/**
 * Voice Control Manager Module - Fresh Implementation
 * Minimal working foundation for voice recording functionality
 */

window.VoiceControlManager = (function() {
    function createVoiceControlManager(elements) {
        let isRecording = false;
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
            statusSpan.style.marginLeft = '10px';
            statusSpan.style.color = 'var(--text-color-secondary)';
            statusSpan.style.fontSize = '0.85em';
            statusSpan.style.fontWeight = 'normal';
            statusSpan.textContent = voiceControlCheckbox.checked ? '(Enabled, using Whisper API)' : '(Disabled)';
            voiceControlLabel.appendChild(statusSpan);
            
            voiceControlCheckbox.addEventListener('change', function() {
                setVoiceControlEnabled(this.checked);
                toggleMicrophoneButton(this.checked);
                statusSpan.textContent = this.checked ? '(Enabled, using Whisper API)' : '(Disabled)';
                
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
                if (isRecording) {
                    stopRecording();
                }
                removeMicrophoneButton();
            }
        }
        
        async function toggleRecording() {
            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        }
        
        // PHASE 1: Absolute minimal recording implementation
        async function startRecording() {
            try {
                console.log('🎤 MINIMAL: Starting basic recording test...');
                
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
                    
                    if (totalSize > 0) {
                        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                        console.log('🎤 MINIMAL: Created blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
                        
                        // Process with Whisper API since basic recording works
                        if (audioBlob.size > 100) {
                            console.log('🎤 MINIMAL: Processing audio with Whisper API...');
                            await processAudioWithWhisper(audioBlob);
                        } else {
                            alert('Recording too small - might be silence');
                        }
                    } else {
                        alert('No audio data captured');
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
                isRecording = true;
                
                // Update button
                if (microphoneButton) {
                    microphoneButton.classList.add('recording');
                    microphoneButton.innerHTML = `
                        <div class="sound-bars">
                            <div class="sound-bar"></div>
                            <div class="sound-bar"></div>
                            <div class="sound-bar"></div>
                        </div>
                    `;
                    microphoneButton.title = 'Stop recording';
                }
                
                console.log('🎤 MINIMAL: Recording started successfully, state:', mediaRecorder.state);
                
            } catch (error) {
                console.error('🎤 MINIMAL: Error starting recording:', error);
                alert('Failed to start recording: ' + error.message);
                
                // Clean up on error
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                    currentStream = null;
                }
                isRecording = false;
                
                // Reset button
                if (microphoneButton) {
                    microphoneButton.classList.remove('recording');
                    microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';
                    microphoneButton.title = 'Start voice recording';
                }
            }
        }
        
        function stopRecording() {
            console.log('🎤 MINIMAL: Stopping recording...');
            
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
            
            isRecording = false;
            
            // Reset button
            if (microphoneButton) {
                microphoneButton.classList.remove('recording');
                microphoneButton.innerHTML = '<i class="fas fa-microphone"></i>';
                microphoneButton.title = 'Start voice recording';
            }
        }
        
        // Process audio with Whisper API
        async function processAudioWithWhisper(audioBlob) {
            try {
                // Get API configuration
                const apiKey = window.StorageService?.getApiKey();
                const baseUrl = window.StorageService?.getBaseUrl() || 'https://api.openai.com/v1';
                
                if (!apiKey) {
                    alert('Please configure your API key to use voice control.');
                    return;
                }
                
                console.log('🎤 MINIMAL: Sending to Whisper API...', {
                    size: audioBlob.size,
                    type: audioBlob.type,
                    endpoint: `${baseUrl}/audio/transcriptions`
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
                formData.append('model', 'whisper-1');
                
                // Send to API
                const response = await fetch(`${baseUrl}/audio/transcriptions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: formData
                });
                
                console.log('🎤 MINIMAL: Whisper API response:', response.status);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
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
            }
        }
        
        function getVoiceControlEnabled() {
            const stored = localStorage.getItem('voice_control_enabled');
            return stored === 'true';
        }
        
        function setVoiceControlEnabled(enabled) {
            localStorage.setItem('voice_control_enabled', enabled ? 'true' : 'false');
        }
        
        function getVoiceControlStatus() {
            const enabled = getVoiceControlEnabled();
            return enabled ? 'Enabled (using Whisper API)' : 'Disabled';
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