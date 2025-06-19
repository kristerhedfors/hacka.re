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
                authType: 'oauth-web',
                apiBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
                oauthConfig: {
                    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                    tokenEndpoint: 'https://oauth2.googleapis.com/token',
                    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
                    clientId: '',
                    requiresClientSecret: true,
                    redirectUri: window.location.origin.startsWith('file://') ? 'http://localhost:8000' : window.location.origin,
                    responseType: 'code',
                    grantType: 'authorization_code',
                    additionalParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                },
                setupInstructions: {
                    title: 'Gmail OAuth Setup',
                    steps: [
                        'Create a Google Cloud Project and enable Gmail API',
                        'Go to Credentials → Create Credentials → OAuth 2.0 Client IDs',
                        'Select "Web application" as the application type',
                        'Give it a name like "hacka.re Gmail Integration"',
                        'Add authorized redirect URIs: https://hacka.re AND http://localhost:8000',
                        'Copy your Client ID and Client Secret',
                        'Enter them below to start the authorization flow',
                        'You\'ll be redirected to Google to grant permissions'
                    ],
                    docUrl: 'https://developers.google.com/identity/protocols/oauth2/web-server'
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
         * Start OAuth authorization code flow
         */
        async startAuthorizationFlow(oauthConfig) {
            try {
                console.log('[Gmail Provider] Starting authorization code flow with config:', {
                    endpoint: oauthConfig.authorizationEndpoint,
                    clientId: oauthConfig.clientId ? `present (${oauthConfig.clientId.substring(0, 10)}...)` : 'missing',
                    clientSecret: oauthConfig.clientSecret ? 'present' : 'missing',
                    scope: oauthConfig.scope,
                    redirectUri: oauthConfig.redirectUri
                });

                if (!oauthConfig.clientId || oauthConfig.clientId.trim() === '') {
                    throw new Error('OAuth Client ID is required for authorization flow');
                }

                if (!oauthConfig.clientSecret || oauthConfig.clientSecret.trim() === '') {
                    throw new Error('OAuth Client Secret is required for authorization flow');
                }

                // Generate state for security
                const state = this.generateRandomString(32);
                
                // Build authorization URL
                const authParams = new URLSearchParams({
                    client_id: oauthConfig.clientId,
                    redirect_uri: oauthConfig.redirectUri,
                    response_type: oauthConfig.responseType || 'code',
                    scope: oauthConfig.scope,
                    state: state,
                    access_type: oauthConfig.additionalParams?.access_type || 'offline',
                    prompt: oauthConfig.additionalParams?.prompt || 'consent'
                });

                const authUrl = `${oauthConfig.authorizationEndpoint}?${authParams.toString()}`;
                
                // Store state for validation
                sessionStorage.setItem('oauth_state', state);
                sessionStorage.setItem('oauth_config', JSON.stringify(oauthConfig));
                
                return authUrl;
            } catch (error) {
                console.error('[Gmail Provider] Authorization flow start failed:', error);
                throw error;
            }
        }

        /**
         * Generate random string for OAuth state
         */
        generateRandomString(length) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        /**
         * Exchange authorization code for tokens
         */
        async exchangeCodeForTokens(code, oauthConfig) {
            try {
                console.log('[Gmail Provider] Exchanging authorization code for tokens');
                
                const tokenResponse = await fetch(oauthConfig.tokenEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        client_id: oauthConfig.clientId,
                        client_secret: oauthConfig.clientSecret,
                        code: code,
                        grant_type: oauthConfig.grantType || 'authorization_code',
                        redirect_uri: oauthConfig.redirectUri
                    })
                });

                if (!tokenResponse.ok) {
                    const errorText = await tokenResponse.text();
                    throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
                }

                const tokenData = await tokenResponse.json();
                
                const tokens = {
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresAt: Date.now() + (tokenData.expires_in * 1000),
                    clientId: oauthConfig.clientId,
                    clientSecret: oauthConfig.clientSecret
                };
                
                await this.storeTokens(tokens);
                return tokens;
            } catch (error) {
                console.error('[Gmail Provider] Token exchange failed:', error);
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