/**
 * Gmail Service Connector for MCP
 * Extends OAuthConnector with Gmail-specific functionality
 */

(function(global) {
    'use strict';

    class GmailConnector extends global.OAuthConnector {
        constructor() {
            super('gmail', {
                name: 'Gmail',
                icon: 'fas fa-envelope',
                description: 'Comprehensive READ ONLY access to Gmail messages, threads, and labels',
                authType: 'oauth-web',
                apiBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
                oauthConfig: {
                    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                    tokenEndpoint: 'https://oauth2.googleapis.com/token',
                    scope: 'https://www.googleapis.com/auth/gmail.readonly',
                    clientId: '',
                    requiresClientSecret: true,
                    redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
                    responseType: 'code',
                    accessType: 'offline'
                },
                setupInstructions: {
                    title: 'Gmail OAuth Setup',
                    steps: [
                        'Create a Google Cloud Project and enable Gmail API',
                        'Create OAuth 2.0 credentials - MUST be "Desktop app" type (NOT "Web application")',
                        'Copy your Client ID and Client Secret from the Desktop app credentials',
                        'Enter them below to start authentication',
                        'You\'ll be redirected to Google to authorize access',
                        'Copy the authorization code and paste it back here'
                    ],
                    docUrl: 'https://developers.google.com/gmail/api/quickstart/js'
                },
                tools: GmailConnector.getGmailTools()
            });
        }

        /**
         * Define Gmail tools
         */
        static getGmailTools() {
            return {
                list_messages: {
                    description: 'List Gmail messages with rich metadata (subject, sender, date, snippet)',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Gmail search query (e.g., "is:unread")' },
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            labelIds: { type: 'array', items: { type: 'string' } },
                            format: { type: 'string', description: 'Format: minimal, metadata, or full (default: metadata)' },
                            pageToken: { type: 'string', description: 'Token for pagination' }
                        }
                    }
                },
                get_message: {
                    description: 'Get complete email message with headers, body, and attachments info',
                    parameters: {
                        type: 'object',
                        properties: {
                            messageId: { type: 'string', description: 'Gmail message ID' },
                            format: { type: 'string', description: 'Format: minimal, metadata, or full (default: full)' }
                        },
                        required: ['messageId']
                    }
                },
                search_messages: {
                    description: 'Search Gmail messages with advanced criteria and rich results',
                    parameters: {
                        type: 'object',
                        properties: {
                            from: { type: 'string', description: 'From email address' },
                            to: { type: 'string', description: 'To email address' },
                            subject: { type: 'string', description: 'Subject keywords' },
                            after: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            before: { type: 'string', description: 'Date in YYYY/MM/DD format' },
                            hasAttachment: { type: 'boolean', description: 'Has attachments' },
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            format: { type: 'string', description: 'Format: minimal, metadata, or full (default: metadata)' }
                        }
                    }
                },
                list_threads: {
                    description: 'List Gmail conversation threads with participants and message counts',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Gmail search query' },
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            labelIds: { type: 'array', items: { type: 'string' } },
                            pageToken: { type: 'string', description: 'Token for pagination' }
                        }
                    }
                },
                get_thread: {
                    description: 'Get complete conversation thread with all messages',
                    parameters: {
                        type: 'object',
                        properties: {
                            threadId: { type: 'string', description: 'Gmail thread ID' },
                            format: { type: 'string', description: 'Format: minimal, metadata, or full (default: metadata)' }
                        },
                        required: ['threadId']
                    }
                },
                list_labels: {
                    description: 'List all Gmail labels with message counts',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                get_label: {
                    description: 'Get specific Gmail label details and statistics',
                    parameters: {
                        type: 'object',
                        properties: {
                            labelId: { type: 'string', description: 'Gmail label ID (e.g., "INBOX", "SENT")' }
                        },
                        required: ['labelId']
                    }
                },
                get_profile: {
                    description: 'Get Gmail user profile information',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                get_attachment: {
                    description: 'Download email attachment',
                    parameters: {
                        type: 'object',
                        properties: {
                            messageId: { type: 'string', description: 'Gmail message ID' },
                            attachmentId: { type: 'string', description: 'Attachment ID from message' }
                        },
                        required: ['messageId', 'attachmentId']
                    }
                },
                list_drafts: {
                    description: 'List saved email drafts (READ ONLY)',
                    parameters: {
                        type: 'object',
                        properties: {
                            maxResults: { type: 'number', default: 10, maximum: 100 },
                            pageToken: { type: 'string', description: 'Token for pagination' }
                        }
                    }
                }
            };
        }

        /**
         * Execute Gmail tool
         */
        async executeTool(toolName, params) {
            if (!this.connection || !this.connection.tokens) {
                throw new Error('Gmail not connected');
            }

            // Remove gmail_ prefix if present
            const baseTool = toolName.replace('gmail_', '');
            let url;

            switch (baseTool) {
                case 'list_messages':
                    url = `${this.config.apiBaseUrl}/users/me/messages?`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    if (params.labelIds && params.labelIds.length > 0) {
                        url += params.labelIds.map(id => `labelIds=${encodeURIComponent(id)}`).join('&') + '&';
                    }
                    if (params.pageToken) url += `pageToken=${encodeURIComponent(params.pageToken)}&`;
                    url += `maxResults=${params.maxResults || 10}`;
                    
                    // Enrich with metadata if requested
                    const format = params.format || 'metadata';
                    if (format === 'metadata' || format === 'full') {
                        const response = await this.makeOAuthRequest(url);
                        if (response.messages) {
                            response.messages = await this.enrichMessages(response.messages, format);
                        }
                        return response;
                    }
                    break;

                case 'get_message':
                    const msgFormat = params.format || 'full';
                    url = `${this.config.apiBaseUrl}/users/me/messages/${params.messageId}?format=${msgFormat}`;
                    const message = await this.makeOAuthRequest(url);
                    return this.formatMessage(message, msgFormat);

                case 'search_messages':
                    const searchQuery = this.buildSearchQuery(params);
                    url = `${this.config.apiBaseUrl}/users/me/messages?q=${encodeURIComponent(searchQuery)}`;
                    url += `&maxResults=${params.maxResults || 10}`;
                    
                    const searchFormat = params.format || 'metadata';
                    const searchResponse = await this.makeOAuthRequest(url);
                    if (searchResponse.messages && (searchFormat === 'metadata' || searchFormat === 'full')) {
                        searchResponse.messages = await this.enrichMessages(searchResponse.messages, searchFormat);
                        searchResponse.searchQuery = searchQuery;
                        searchResponse.searchCriteria = params;
                    }
                    return searchResponse;

                case 'list_threads':
                    url = `${this.config.apiBaseUrl}/users/me/threads?`;
                    if (params.query) url += `q=${encodeURIComponent(params.query)}&`;
                    if (params.labelIds && params.labelIds.length > 0) {
                        url += params.labelIds.map(id => `labelIds=${encodeURIComponent(id)}`).join('&') + '&';
                    }
                    if (params.pageToken) url += `pageToken=${encodeURIComponent(params.pageToken)}&`;
                    url += `maxResults=${params.maxResults || 10}`;
                    break;

                case 'get_thread':
                    const threadFormat = params.format || 'metadata';
                    url = `${this.config.apiBaseUrl}/users/me/threads/${params.threadId}?format=${threadFormat}`;
                    const thread = await this.makeOAuthRequest(url);
                    return this.formatThread(thread);

                case 'list_labels':
                    url = `${this.config.apiBaseUrl}/users/me/labels`;
                    break;

                case 'get_label':
                    url = `${this.config.apiBaseUrl}/users/me/labels/${params.labelId}`;
                    break;

                case 'get_profile':
                    url = `${this.config.apiBaseUrl}/users/me/profile`;
                    break;

                case 'get_attachment':
                    url = `${this.config.apiBaseUrl}/users/me/messages/${params.messageId}/attachments/${params.attachmentId}`;
                    const attachment = await this.makeOAuthRequest(url);
                    return this.formatAttachment(attachment);

                case 'list_drafts':
                    url = `${this.config.apiBaseUrl}/users/me/drafts?`;
                    if (params.pageToken) url += `pageToken=${encodeURIComponent(params.pageToken)}&`;
                    url += `maxResults=${params.maxResults || 10}`;
                    break;

                default:
                    throw new Error(`Unknown Gmail tool: ${toolName}`);
            }

            // For simple cases without special processing
            if (url) {
                return await this.makeOAuthRequest(url);
            }
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
         * Enrich messages with metadata
         */
        async enrichMessages(messages, format) {
            const enriched = await Promise.all(
                messages.slice(0, Math.min(messages.length, 50)).map(async (msg) => {
                    try {
                        const url = `${this.config.apiBaseUrl}/users/me/messages/${msg.id}?format=metadata`;
                        const detail = await this.makeOAuthRequest(url);
                        return this.formatMessageMetadata(detail);
                    } catch (error) {
                        console.warn(`Failed to fetch details for message ${msg.id}:`, error);
                        return { id: msg.id, error: 'Failed to fetch details' };
                    }
                })
            );
            return enriched;
        }

        /**
         * Format message metadata
         */
        formatMessageMetadata(message) {
            const formatted = {
                id: message.id,
                threadId: message.threadId,
                labelIds: message.labelIds || [],
                snippet: message.snippet || '',
                sizeEstimate: message.sizeEstimate || 0,
                internalDate: message.internalDate ? new Date(parseInt(message.internalDate)).toISOString() : null
            };

            // Extract headers
            if (message.payload && message.payload.headers) {
                const headers = {};
                for (const header of message.payload.headers) {
                    headers[header.name.toLowerCase()] = header.value;
                }
                
                formatted.subject = headers.subject || '(No Subject)';
                formatted.from = headers.from || 'Unknown Sender';
                formatted.to = headers.to || '';
                formatted.date = headers.date || '';
                formatted.cc = headers.cc || '';
                
                if (headers.date) {
                    try {
                        formatted.parsedDate = new Date(headers.date).toISOString();
                    } catch (e) {
                        formatted.parsedDate = null;
                    }
                }
            }

            // Check for attachments
            if (message.payload) {
                formatted.hasAttachments = this.hasAttachments(message.payload);
                if (formatted.hasAttachments) {
                    formatted.attachments = this.extractAttachments(message.payload);
                }
            }

            // Determine read status
            formatted.isUnread = message.labelIds ? message.labelIds.includes('UNREAD') : false;
            formatted.isImportant = message.labelIds ? message.labelIds.includes('IMPORTANT') : false;

            return formatted;
        }

        /**
         * Format full message
         */
        formatMessage(message, format) {
            if (format === 'minimal') {
                return { id: message.id, threadId: message.threadId };
            }

            const formatted = this.formatMessageMetadata(message);

            if (format === 'full' && message.payload) {
                formatted.body = this.extractBody(message.payload);
                formatted.textContent = this.extractText(message.payload);
                formatted.htmlContent = this.extractHtml(message.payload);
            }

            return formatted;
        }

        /**
         * Format thread
         */
        formatThread(thread) {
            const formatted = {
                id: thread.id,
                historyId: thread.historyId,
                messageCount: thread.messages ? thread.messages.length : 0,
                messages: []
            };

            if (thread.messages) {
                // Get subject from first message
                const firstMessage = thread.messages[0];
                if (firstMessage && firstMessage.payload && firstMessage.payload.headers) {
                    const headers = {};
                    for (const header of firstMessage.payload.headers) {
                        headers[header.name.toLowerCase()] = header.value;
                    }
                    formatted.subject = headers.subject || '(No Subject)';
                }

                // Format each message
                formatted.messages = thread.messages.map(msg => this.formatMessageMetadata(msg));
                
                // Extract participants
                formatted.participants = this.extractParticipants(thread.messages);
            }

            return formatted;
        }

        /**
         * Format attachment
         */
        formatAttachment(attachment) {
            return {
                size: attachment.size,
                data: attachment.data, // Base64 encoded
                decodedSize: attachment.data ? Math.floor(attachment.data.length * 0.75) : 0
            };
        }

        /**
         * Check if message has attachments
         */
        hasAttachments(payload) {
            if (!payload.parts) return false;
            
            for (const part of payload.parts) {
                if (part.filename && part.filename.length > 0) {
                    return true;
                }
                if (part.parts && this.hasAttachments(part)) {
                    return true;
                }
            }
            
            return false;
        }

        /**
         * Extract attachment information
         */
        extractAttachments(payload, attachments = []) {
            if (!payload.parts) return attachments;
            
            for (const part of payload.parts) {
                if (part.filename && part.filename.length > 0) {
                    attachments.push({
                        filename: part.filename,
                        mimeType: part.mimeType,
                        size: part.body ? part.body.size : 0,
                        attachmentId: part.body ? part.body.attachmentId : null
                    });
                }
                if (part.parts) {
                    this.extractAttachments(part, attachments);
                }
            }
            
            return attachments;
        }

        /**
         * Extract message body
         */
        extractBody(payload) {
            const text = this.extractText(payload);
            const html = this.extractHtml(payload);
            
            return {
                text: text,
                html: html,
                hasText: !!text,
                hasHtml: !!html
            };
        }

        /**
         * Extract text content
         */
        extractText(payload) {
            if (!payload) return '';
            
            if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
                return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            
            if (payload.parts) {
                for (const part of payload.parts) {
                    const text = this.extractText(part);
                    if (text) return text;
                }
            }
            
            return '';
        }

        /**
         * Extract HTML content
         */
        extractHtml(payload) {
            if (!payload) return '';
            
            if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
                return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            
            if (payload.parts) {
                for (const part of payload.parts) {
                    const html = this.extractHtml(part);
                    if (html) return html;
                }
            }
            
            return '';
        }

        /**
         * Extract participants from thread messages
         */
        extractParticipants(messages) {
            const participants = new Set();
            
            for (const message of messages) {
                if (message.payload && message.payload.headers) {
                    for (const header of message.payload.headers) {
                        if (header.name.toLowerCase() === 'from') {
                            participants.add(header.value);
                        }
                    }
                }
            }
            
            return Array.from(participants);
        }
    }

    // Export to global scope
    global.GmailConnector = GmailConnector;

})(window);