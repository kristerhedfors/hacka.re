/**
 * Gmail MCP Provider
 * 
 * Provides Gmail API integration with OAuth device flow authentication
 */

(function(global) {
    'use strict';

    class GmailProvider {
        constructor() {
            this.serviceKey = 'gmail';
            this.config = {
                name: 'Gmail',
                icon: 'fas fa-envelope',
                description: 'Access Gmail messages and send emails',
                authType: 'oauth-device',
                apiBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
                oauthConfig: {
                    authorizationEndpoint: 'https://oauth2.googleapis.com/device/code',
                    tokenEndpoint: 'https://oauth2.googleapis.com/token',
                    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
                    clientId: '',
                    requiresClientSecret: true
                },
                setupInstructions: {
                    title: 'Gmail OAuth Setup',
                    steps: [
                        'Create a Google Cloud Project and enable Gmail API',
                        'Create OAuth 2.0 credentials (Desktop application type)',
                        'Copy your Client ID and Client Secret',
                        'Enter them below to start the device flow authentication',
                        'You\'ll be given a code to enter on Google\'s device page',
                        'Grant permissions to access your Gmail'
                    ],
                    docUrl: 'https://developers.google.com/gmail/api/quickstart/js'
                },
                tools: {
                    list_messages: {
                        description: 'List Gmail messages',
                        parameters: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'Gmail search query (e.g., "is:unread")' },
                                maxResults: { type: 'number', default: 10, maximum: 100 },
                                labelIds: { type: 'array', items: { type: 'string' } }
                            }
                        }
                    },
                    get_message: {
                        description: 'Get a specific email message',
                        parameters: {
                            type: 'object',
                            properties: {
                                messageId: { type: 'string', description: 'Gmail message ID' }
                            },
                            required: ['messageId']
                        }
                    },
                    send_message: {
                        description: 'Send an email',
                        parameters: {
                            type: 'object',
                            properties: {
                                to: { type: 'string' },
                                subject: { type: 'string' },
                                body: { type: 'string' },
                                cc: { type: 'string' },
                                bcc: { type: 'string' }
                            },
                            required: ['to', 'subject', 'body']
                        }
                    },
                    search_messages: {
                        description: 'Search Gmail messages with advanced query',
                        parameters: {
                            type: 'object',
                            properties: {
                                from: { type: 'string' },
                                to: { type: 'string' },
                                subject: { type: 'string' },
                                after: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                                before: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                                hasAttachment: { type: 'boolean' }
                            }
                        }
                    }
                }
            };
        }

        /**
         * Connect to Gmail using OAuth device flow
         */
        async connect() {
            const storageKey = `mcp_${this.serviceKey}_oauth`;
            const existingAuth = await window.CoreStorageService.getValue(storageKey);

            if (existingAuth && existingAuth.refreshToken) {
                const tokens = await this.refreshToken(existingAuth);
                if (tokens) {
                    return { success: true, tokens };
                }
            }

            return { success: false, requiresOAuth: true };
        }

        /**
         * Start OAuth device flow
         */
        async startDeviceFlow(oauthConfig) {
            try {
                console.log('[Gmail Provider] Starting device flow with config:', {
                    endpoint: oauthConfig.authorizationEndpoint,
                    clientId: oauthConfig.clientId ? 'present' : 'missing',
                    scope: oauthConfig.scope
                });

                if (!oauthConfig.clientId) {
                    throw new Error('OAuth Client ID is required for device flow');
                }

                if (!oauthConfig.clientSecret) {
                    throw new Error('OAuth Client Secret is required for device flow');
                }

                const deviceResponse = await fetch(oauthConfig.authorizationEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        client_id: oauthConfig.clientId,
                        scope: oauthConfig.scope
                    })
                });

                if (!deviceResponse.ok) {
                    const errorText = await deviceResponse.text();
                    console.error('[Gmail Provider] Device flow error:', {
                        status: deviceResponse.status,
                        statusText: deviceResponse.statusText,
                        error: errorText
                    });
                    throw new Error(`Failed to get device code: ${deviceResponse.status} ${errorText}`);
                }

                return await deviceResponse.json();
            } catch (error) {
                console.error('[Gmail Provider] Device flow start failed:', error);
                throw error;
            }
        }

        /**
         * Poll for device authorization completion
         */
        async pollForAuthorization(oauthConfig, deviceData) {
            const pollInterval = (deviceData.interval || 5) * 1000;
            const expiresAt = Date.now() + (deviceData.expires_in * 1000);
            
            while (Date.now() < expiresAt) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                
                try {
                    const tokenResponse = await fetch(oauthConfig.tokenEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            client_id: oauthConfig.clientId,
                            client_secret: oauthConfig.clientSecret,
                            device_code: deviceData.device_code,
                            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                        })
                    });
                    
                    const tokenData = await tokenResponse.json();
                    
                    if (tokenData.access_token) {
                        const tokens = {
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token,
                            expiresAt: Date.now() + (tokenData.expires_in * 1000),
                            clientId: oauthConfig.clientId,
                            clientSecret: oauthConfig.clientSecret
                        };
                        
                        await this.storeTokens(tokens);
                        return tokens;
                    }
                    
                    if (tokenData.error === 'authorization_pending') {
                        continue;
                    }
                    
                    if (tokenData.error === 'access_denied') {
                        throw new Error('Authentication was denied');
                    }
                } catch (error) {
                    console.error('[Gmail Provider] Polling error:', error);
                }
            }
            
            throw new Error('Authentication timed out');
        }

        /**
         * Store OAuth tokens
         */
        async storeTokens(tokens) {
            const storageKey = `mcp_${this.serviceKey}_oauth`;
            await window.CoreStorageService.setValue(storageKey, tokens);
        }

        /**
         * Refresh OAuth token
         */
        async refreshToken(authData) {
            if (!authData.refreshToken) return null;

            try {
                const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        client_id: authData.clientId,
                        client_secret: authData.clientSecret,
                        refresh_token: authData.refreshToken,
                        grant_type: 'refresh_token'
                    })
                });

                const data = await response.json();
                
                if (data.access_token) {
                    const newTokens = {
                        ...authData,
                        accessToken: data.access_token,
                        expiresAt: Date.now() + (data.expires_in * 1000)
                    };
                    
                    await this.storeTokens(newTokens);
                    return newTokens;
                }
            } catch (error) {
                console.error('[Gmail Provider] Token refresh failed:', error);
            }
            
            return null;
        }

        /**
         * Execute Gmail API calls
         */
        async executeTool(toolName, params, tokens) {
            // Check if token needs refresh
            if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60000) {
                const newTokens = await this.refreshToken(tokens);
                if (newTokens) {
                    tokens = newTokens;
                }
            }

            let url, method = 'GET', body = null;

            switch (toolName) {
                case 'list_messages':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    url += `maxResults=${params.maxResults || 10}`;
                    break;
                case 'get_message':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.messageId}`;
                    break;
                case 'send_message':
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;
                    method = 'POST';
                    const email = this.createEmailMessage(params);
                    body = JSON.stringify({ raw: btoa(email).replace(/\+/g, '-').replace(/\//g, '_') });
                    break;
                case 'search_messages':
                    const query = this.buildSearchQuery(params);
                    url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;
                    break;
                default:
                    throw new Error(`Unknown Gmail tool: ${toolName}`);
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${tokens.accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body
            });

            if (!response.ok) {
                throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        }

        /**
         * Create email message in RFC 2822 format
         */
        createEmailMessage(params) {
            let email = '';
            email += `To: ${params.to}\r\n`;
            if (params.cc) email += `Cc: ${params.cc}\r\n`;
            if (params.bcc) email += `Bcc: ${params.bcc}\r\n`;
            email += `Subject: ${params.subject}\r\n`;
            email += `Content-Type: text/plain; charset="UTF-8"\r\n`;
            email += `\r\n`;
            email += params.body;
            return email;
        }

        /**
         * Build Gmail search query from parameters
         */
        buildSearchQuery(params) {
            const parts = [];
            if (params.from) parts.push(`from:${params.from}`);
            if (params.to) parts.push(`to:${params.to}`);
            if (params.subject) parts.push(`subject:${params.subject}`);
            if (params.after) parts.push(`after:${params.after}`);
            if (params.before) parts.push(`before:${params.before}`);
            if (params.hasAttachment) parts.push('has:attachment');
            return parts.join(' ');
        }

        /**
         * Disconnect and cleanup
         */
        async disconnect() {
            const storageKey = `mcp_${this.serviceKey}_oauth`;
            await window.CoreStorageService.removeValue(storageKey);
        }
    }

    global.GmailProvider = GmailProvider;

})(window);