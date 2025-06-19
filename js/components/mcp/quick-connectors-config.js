/**
 * Quick Connectors Configuration
 * 
 * Service configurations and setup instructions for quick connectors
 */

window.QuickConnectorsConfig = (function() {
    'use strict';

    const QUICK_CONNECTORS = {
        github: {
            name: 'GitHub',
            icon: 'fab fa-github',
            description: 'Access GitHub repositories, issues, and pull requests',
            transport: 'service-connector',
            authType: 'pat',
            setupInstructions: {
                title: 'GitHub Personal Access Token Setup',
                steps: [
                    'Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)',
                    'Click "Generate new token"',
                    'Give your token a descriptive name like "hacka.re MCP Integration"',
                    'Select scopes: "repo" for full repository access, "read:user" for user info',
                    'Click "Generate token" and copy the token immediately',
                    'Paste the token when prompted (it won\'t be shown again on GitHub)',
                    'Note: Your token will be encrypted and stored locally'
                ],
                docUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
            }
        },
        gmail: {
            name: 'Gmail',
            icon: 'fas fa-envelope',
            description: 'Read and send emails through Gmail',
            transport: 'service-connector',
            authType: 'oauth-device',
            setupInstructions: {
                title: 'Gmail OAuth Setup',
                steps: [
                    'Go to Google Cloud Console (console.cloud.google.com)',
                    'Create a new project or select existing one',
                    'Enable Gmail API in "APIs & Services" > "Library"',
                    'Go to "APIs & Services" > "Credentials"',
                    'Create OAuth 2.0 Client ID (Desktop application type)',
                    'Copy the Client ID and Client Secret',
                    'Enter them when prompted to start device flow authentication'
                ],
                docUrl: 'https://developers.google.com/gmail/api/quickstart/js'
            }
        },
        gdocs: {
            name: 'Google Docs',
            icon: 'fas fa-file-alt',
            description: 'Access and edit Google Docs',
            transport: 'service-connector',
            authType: 'oauth-shared',
            setupInstructions: {
                title: 'Google Docs OAuth Setup',
                steps: [
                    'Google Docs uses the same authentication as Gmail',
                    'If you\'ve already connected Gmail, Docs will work automatically',
                    'Otherwise, set up Gmail first to enable Google Docs access',
                    'Additional permissions for Docs will be requested if needed'
                ],
                docUrl: 'https://developers.google.com/docs/api/quickstart/js'
            }
        },
        calendar: {
            name: 'Google Calendar',
            icon: 'fas fa-calendar-alt',
            description: 'Access and manage Google Calendar events',
            transport: 'oauth',
            serverUrl: 'https://www.googleapis.com/calendar/v3',
            oauthConfig: {
                provider: 'google',
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
                clientId: '',
                redirectUri: window.location.origin.startsWith('file://') ? 'http://localhost:8000' : window.location.origin,
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
            }
        },
        drive: {
            name: 'Google Drive',
            icon: 'fas fa-cloud',
            description: 'Access and manage Google Drive files',
            transport: 'service-connector',
            authType: 'oauth-shared',
            setupInstructions: {
                title: 'Google Drive OAuth Setup',
                steps: [
                    'Google Drive uses the same authentication as Gmail',
                    'If you\'ve already connected Gmail, Drive will work automatically',
                    'Otherwise, set up Gmail first to enable Google Drive access',
                    'Additional permissions for Drive will be requested if needed'
                ],
                docUrl: 'https://developers.google.com/drive/api/quickstart/js'
            }
        }
    };

    /**
     * Get configuration for a service
     */
    function getServiceConfig(serviceKey) {
        return QUICK_CONNECTORS[serviceKey] || null;
    }

    /**
     * Get all available service configurations
     */
    function getAllServiceConfigs() {
        return QUICK_CONNECTORS;
    }

    /**
     * Get services by authentication type
     */
    function getServicesByAuthType(authType) {
        return Object.entries(QUICK_CONNECTORS)
            .filter(([key, config]) => config.authType === authType)
            .reduce((acc, [key, config]) => {
                acc[key] = config;
                return acc;
            }, {});
    }

    /**
     * Get OAuth services
     */
    function getOAuthServices() {
        return getServicesByAuthType('oauth');
    }

    /**
     * Get OAuth device flow services
     */
    function getOAuthDeviceServices() {
        return getServicesByAuthType('oauth-device');
    }

    /**
     * Get PAT (Personal Access Token) services
     */
    function getPATServices() {
        return getServicesByAuthType('pat');
    }

    /**
     * Get shared OAuth services
     */
    function getSharedOAuthServices() {
        return getServicesByAuthType('oauth-shared');
    }

    // Public API
    return {
        getServiceConfig,
        getAllServiceConfigs,
        getServicesByAuthType,
        getOAuthServices,
        getOAuthDeviceServices,
        getPATServices,
        getSharedOAuthServices,
        QUICK_CONNECTORS
    };
})();