/**
 * Google Workspace MCP Provider
 * 
 * Provides Google Docs, Drive, and Calendar integration with OAuth authentication
 */

(function(global) {
    'use strict';

    class GoogleWorkspaceProvider {
        constructor() {
            this.providers = {
                gdocs: {
                    serviceKey: 'gdocs',
                    config: {
                        name: 'Google Docs',
                        icon: 'fas fa-file-alt',
                        description: 'Access and edit Google Docs',
                        authType: 'oauth-shared',
                        apiBaseUrl: 'https://docs.googleapis.com/v1',
                        driveApiBaseUrl: 'https://www.googleapis.com/drive/v3',
                        oauthConfig: {
                            additionalScopes: [
                                'https://www.googleapis.com/auth/documents',
                                'https://www.googleapis.com/auth/drive.readonly'
                            ]
                        },
                        setupInstructions: {
                            title: 'Google Docs OAuth Setup',
                            steps: [
                                'Google Docs uses the same authentication as Gmail',
                                'If you\'ve already connected Gmail, Docs will work automatically',
                                'Otherwise, set up Gmail first to enable Google Docs access',
                                'Additional permissions for Docs will be requested if needed'
                            ],
                            docUrl: 'https://developers.google.com/docs/api/quickstart/js'
                        },
                        tools: {
                            list_documents: {
                                description: 'List Google Docs from Drive',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        query: { type: 'string', description: 'Search query' },
                                        maxResults: { type: 'number', default: 20, maximum: 100 },
                                        orderBy: { type: 'string', enum: ['modifiedTime', 'name', 'createdTime'] }
                                    }
                                }
                            },
                            read_document: {
                                description: 'Read content of a Google Doc',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        documentId: { type: 'string', description: 'Google Doc ID' }
                                    },
                                    required: ['documentId']
                                }
                            },
                            create_document: {
                                description: 'Create a new Google Doc',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        title: { type: 'string' },
                                        content: { type: 'string', description: 'Initial content' }
                                    },
                                    required: ['title']
                                }
                            },
                            update_document: {
                                description: 'Update a Google Doc',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        documentId: { type: 'string' },
                                        requests: { type: 'array', description: 'Batch update requests' }
                                    },
                                    required: ['documentId', 'requests']
                                }
                            },
                            append_text: {
                                description: 'Append text to a Google Doc',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        documentId: { type: 'string' },
                                        text: { type: 'string' }
                                    },
                                    required: ['documentId', 'text']
                                }
                            }
                        }
                    }
                },
                calendar: {
                    serviceKey: 'calendar',
                    config: {
                        name: 'Google Calendar',
                        icon: 'fas fa-calendar-alt',
                        description: 'Access and manage Google Calendar events',
                        authType: 'oauth',
                        apiBaseUrl: 'https://www.googleapis.com/calendar/v3',
                        oauthConfig: {
                            provider: 'google',
                            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                            tokenUrl: 'https://oauth2.googleapis.com/token',
                            scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
                            additionalParams: {
                                access_type: 'offline',
                                prompt: 'consent'
                            }
                        },
                        setupInstructions: {
                            title: 'Google Calendar OAuth Setup',
                            steps: [
                                'Go to Google Cloud Console (console.cloud.google.com)',
                                'Create a new project or select existing one',
                                'Enable Google Calendar API in "APIs & Services" > "Library"',
                                'Go to "APIs & Services" > "Credentials"',
                                'Create OAuth 2.0 Client ID (Web application)',
                                'Add authorized redirect URIs: https://hacka.re AND http://localhost:8000',
                                'Copy the Client ID and paste it below'
                            ],
                            docUrl: 'https://developers.google.com/calendar/api/guides/auth'
                        },
                        tools: {
                            list_calendars: {
                                description: 'List available calendars',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        minAccessRole: { type: 'string', enum: ['owner', 'reader', 'writer'] }
                                    }
                                }
                            },
                            list_events: {
                                description: 'List events from a calendar',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        calendarId: { type: 'string', default: 'primary' },
                                        timeMin: { type: 'string', description: 'RFC3339 timestamp' },
                                        timeMax: { type: 'string', description: 'RFC3339 timestamp' },
                                        maxResults: { type: 'number', default: 10, maximum: 250 }
                                    }
                                }
                            },
                            create_event: {
                                description: 'Create a new calendar event',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        calendarId: { type: 'string', default: 'primary' },
                                        summary: { type: 'string' },
                                        description: { type: 'string' },
                                        start: { type: 'object', description: 'Event start time' },
                                        end: { type: 'object', description: 'Event end time' }
                                    },
                                    required: ['summary', 'start', 'end']
                                }
                            },
                            get_event: {
                                description: 'Get details of a specific event',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        calendarId: { type: 'string', default: 'primary' },
                                        eventId: { type: 'string' }
                                    },
                                    required: ['eventId']
                                }
                            }
                        }
                    }
                },
                drive: {
                    serviceKey: 'drive',
                    config: {
                        name: 'Google Drive',
                        icon: 'fas fa-cloud',
                        description: 'Access and manage Google Drive files',
                        authType: 'oauth-shared',
                        apiBaseUrl: 'https://www.googleapis.com/drive/v3',
                        oauthConfig: {
                            additionalScopes: [
                                'https://www.googleapis.com/auth/drive.readonly',
                                'https://www.googleapis.com/auth/drive.file'
                            ]
                        },
                        setupInstructions: {
                            title: 'Google Drive OAuth Setup',
                            steps: [
                                'Google Drive uses the same authentication as Gmail',
                                'If you\'ve already connected Gmail, Drive will work automatically',
                                'Otherwise, set up Gmail first to enable Google Drive access',
                                'Additional permissions for Drive will be requested if needed'
                            ],
                            docUrl: 'https://developers.google.com/drive/api/quickstart/js'
                        },
                        tools: {
                            list_files: {
                                description: 'List files in Google Drive',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        query: { type: 'string', description: 'Search query' },
                                        pageSize: { type: 'number', default: 20, maximum: 1000 },
                                        orderBy: { type: 'string', enum: ['createdTime', 'modifiedTime', 'name'] }
                                    }
                                }
                            },
                            get_file: {
                                description: 'Get file metadata',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        fileId: { type: 'string' }
                                    },
                                    required: ['fileId']
                                }
                            },
                            download_file: {
                                description: 'Download file content',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        fileId: { type: 'string' },
                                        mimeType: { type: 'string', description: 'Export format for Google Workspace files' }
                                    },
                                    required: ['fileId']
                                }
                            }
                        }
                    }
                }
            };
        }

        /**
         * Get provider by service key
         */
        getProvider(serviceKey) {
            return this.providers[serviceKey];
        }

        /**
         * Connect to Google Workspace service
         */
        async connect(serviceKey) {
            const provider = this.getProvider(serviceKey);
            if (!provider) {
                throw new Error(`Unknown Google Workspace service: ${serviceKey}`);
            }

            if (provider.config.authType === 'oauth-shared') {
                return await this.connectWithSharedOAuth(serviceKey);
            } else {
                return await this.connectWithStandardOAuth(serviceKey);
            }
        }

        /**
         * Connect with shared OAuth (Docs, Drive)
         */
        async connectWithSharedOAuth(serviceKey) {
            const gmailAuth = await window.CoreStorageService.getValue('mcp_gmail_oauth');
            
            if (!gmailAuth || !gmailAuth.refreshToken) {
                return { success: false, requiresGmail: true };
            }

            const tokens = {
                accessToken: gmailAuth.accessToken,
                refreshToken: gmailAuth.refreshToken,
                expiresAt: gmailAuth.expiresAt
            };

            const provider = this.getProvider(serviceKey);
            const hasScopes = await this.checkGoogleScopes(tokens, provider.config.oauthConfig.additionalScopes);
            
            if (!hasScopes) {
                return { success: false, requiresAdditionalScopes: true };
            }

            return { success: true, tokens };
        }

        /**
         * Connect with standard OAuth (Calendar)
         */
        async connectWithStandardOAuth(serviceKey) {
            const storageKey = `mcp_${serviceKey}_oauth`;
            const existingAuth = await window.CoreStorageService.getValue(storageKey);

            if (existingAuth && existingAuth.refreshToken) {
                const tokens = await this.refreshToken(serviceKey, existingAuth);
                if (tokens) {
                    return { success: true, tokens };
                }
            }

            return { success: false, requiresOAuth: true };
        }

        /**
         * Check if token has required Google scopes
         */
        async checkGoogleScopes(tokens, requiredScopes) {
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + tokens.accessToken);
                const info = await response.json();
                
                if (!info.scope) return false;
                
                const grantedScopes = info.scope.split(' ');
                return requiredScopes.every(scope => grantedScopes.includes(scope));
            } catch (error) {
                console.error('[Google Workspace Provider] Scope check failed:', error);
                return false;
            }
        }

        /**
         * Store OAuth tokens
         */
        async storeTokens(serviceKey, tokens) {
            const storageKey = `mcp_${serviceKey}_oauth`;
            await window.CoreStorageService.setValue(storageKey, tokens);
        }

        /**
         * Refresh OAuth token
         */
        async refreshToken(serviceKey, authData) {
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
                    
                    await this.storeTokens(serviceKey, newTokens);
                    return newTokens;
                }
            } catch (error) {
                console.error('[Google Workspace Provider] Token refresh failed:', error);
            }
            
            return null;
        }

        /**
         * Execute Google Workspace API calls
         */
        async executeTool(serviceKey, toolName, params, tokens) {
            const provider = this.getProvider(serviceKey);
            if (!provider) {
                throw new Error(`Unknown service: ${serviceKey}`);
            }

            // Check if token needs refresh
            if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60000) {
                const newTokens = await this.refreshToken(serviceKey, tokens);
                if (newTokens) {
                    tokens = newTokens;
                }
            }

            switch (serviceKey) {
                case 'gdocs':
                    return await this.executeDocsTool(toolName, params, tokens);
                case 'calendar':
                    return await this.executeCalendarTool(toolName, params, tokens);
                case 'drive':
                    return await this.executeDriveTool(toolName, params, tokens);
                default:
                    throw new Error(`Unknown service: ${serviceKey}`);
            }
        }

        /**
         * Execute Google Docs API calls
         */
        async executeDocsTool(toolName, params, tokens) {
            let url, method = 'GET', body = null;

            switch (toolName) {
                case 'list_documents':
                    url = `https://www.googleapis.com/drive/v3/files?`;
                    url += `mimeType='application/vnd.google-apps.document'&`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    url += `pageSize=${params.maxResults || 20}`;
                    if (params.orderBy) url += `&orderBy=${params.orderBy}`;
                    break;
                case 'read_document':
                    url = `https://docs.googleapis.com/v1/documents/${params.documentId}`;
                    break;
                case 'create_document':
                    url = `https://docs.googleapis.com/v1/documents`;
                    method = 'POST';
                    body = JSON.stringify({ title: params.title });
                    break;
                case 'update_document':
                    url = `https://docs.googleapis.com/v1/documents/${params.documentId}:batchUpdate`;
                    method = 'POST';
                    body = JSON.stringify({ requests: params.requests });
                    break;
                case 'append_text':
                    url = `https://docs.googleapis.com/v1/documents/${params.documentId}:batchUpdate`;
                    method = 'POST';
                    const doc = await this.getDocumentStructure(params.documentId, tokens.accessToken);
                    const endIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;
                    body = JSON.stringify({
                        requests: [{
                            insertText: {
                                location: { index: endIndex },
                                text: params.text
                            }
                        }]
                    });
                    break;
                default:
                    throw new Error(`Unknown Google Docs tool: ${toolName}`);
            }

            return await this.makeGoogleApiRequest(url, method, body, tokens.accessToken);
        }

        /**
         * Execute Google Calendar API calls
         */
        async executeCalendarTool(toolName, params, tokens) {
            let url, method = 'GET', body = null;

            switch (toolName) {
                case 'list_calendars':
                    url = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
                    if (params.minAccessRole) url += `?minAccessRole=${params.minAccessRole}`;
                    break;
                case 'list_events':
                    const calendarId = params.calendarId || 'primary';
                    url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?`;
                    if (params.timeMin) url += `timeMin=${params.timeMin}&`;
                    if (params.timeMax) url += `timeMax=${params.timeMax}&`;
                    url += `maxResults=${params.maxResults || 10}`;
                    break;
                case 'create_event':
                    const createCalendarId = params.calendarId || 'primary';
                    url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(createCalendarId)}/events`;
                    method = 'POST';
                    body = JSON.stringify({
                        summary: params.summary,
                        description: params.description,
                        start: params.start,
                        end: params.end
                    });
                    break;
                case 'get_event':
                    const getCalendarId = params.calendarId || 'primary';
                    url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId)}/events/${params.eventId}`;
                    break;
                default:
                    throw new Error(`Unknown Google Calendar tool: ${toolName}`);
            }

            return await this.makeGoogleApiRequest(url, method, body, tokens.accessToken);
        }

        /**
         * Execute Google Drive API calls
         */
        async executeDriveTool(toolName, params, tokens) {
            let url, method = 'GET', body = null;

            switch (toolName) {
                case 'list_files':
                    url = `https://www.googleapis.com/drive/v3/files?`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    url += `pageSize=${params.pageSize || 20}`;
                    if (params.orderBy) url += `&orderBy=${params.orderBy}`;
                    break;
                case 'get_file':
                    url = `https://www.googleapis.com/drive/v3/files/${params.fileId}`;
                    break;
                case 'download_file':
                    if (params.mimeType) {
                        url = `https://www.googleapis.com/drive/v3/files/${params.fileId}/export?mimeType=${encodeURIComponent(params.mimeType)}`;
                    } else {
                        url = `https://www.googleapis.com/drive/v3/files/${params.fileId}?alt=media`;
                    }
                    break;
                default:
                    throw new Error(`Unknown Google Drive tool: ${toolName}`);
            }

            return await this.makeGoogleApiRequest(url, method, body, tokens.accessToken);
        }

        /**
         * Make Google API request
         */
        async makeGoogleApiRequest(url, method, body, accessToken) {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body
            });

            if (!response.ok) {
                throw new Error(`Google API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        }

        /**
         * Get document structure for appending
         */
        async getDocumentStructure(documentId, accessToken) {
            const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            return await response.json();
        }

        /**
         * Disconnect and cleanup
         */
        async disconnect(serviceKey) {
            const storageKey = `mcp_${serviceKey}_oauth`;
            await window.CoreStorageService.removeValue(storageKey);
        }
    }

    global.GoogleWorkspaceProvider = GoogleWorkspaceProvider;

})(window);