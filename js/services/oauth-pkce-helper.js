/**
 * OAuth PKCE Helper
 * 
 * Provides PKCE (Proof Key for Code Exchange) functionality for secure OAuth flows
 */

window.OAuthPKCEHelper = (function() {
    'use strict';

    /**
     * PKCE (Proof Key for Code Exchange) helper class
     */
    class PKCEHelper {
        /**
         * Generate code verifier
         */
        static generateCodeVerifier() {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return this.base64URLEncode(array);
        }

        /**
         * Generate code challenge from verifier
         */
        static async generateCodeChallenge(verifier) {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return this.base64URLEncode(new Uint8Array(digest));
        }

        /**
         * Base64 URL encode
         */
        static base64URLEncode(buffer) {
            const base64 = btoa(String.fromCharCode(...buffer));
            return base64
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        }

        /**
         * Generate state parameter
         */
        static generateState() {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return this.base64URLEncode(array);
        }

        /**
         * Generate nonce (for OpenID Connect)
         */
        static generateNonce() {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return this.base64URLEncode(array);
        }

        /**
         * Create PKCE parameters for OAuth flow
         */
        static async createPKCEParameters() {
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            const state = this.generateState();
            
            return {
                codeVerifier,
                codeChallenge,
                codeChallengeMethod: 'S256',
                state
            };
        }

        /**
         * Validate state parameter
         */
        static validateState(receivedState, expectedState) {
            return receivedState === expectedState;
        }

        /**
         * Create authorization URL with PKCE parameters
         */
        static createAuthorizationUrl(baseUrl, params) {
            const url = new URL(baseUrl);
            
            // Add standard OAuth parameters
            if (params.clientId) url.searchParams.set('client_id', params.clientId);
            if (params.redirectUri) url.searchParams.set('redirect_uri', params.redirectUri);
            if (params.scope) url.searchParams.set('scope', params.scope);
            if (params.state) url.searchParams.set('state', params.state);
            if (params.responseType) url.searchParams.set('response_type', params.responseType || 'code');
            
            // Add PKCE parameters
            if (params.codeChallenge) {
                url.searchParams.set('code_challenge', params.codeChallenge);
                url.searchParams.set('code_challenge_method', params.codeChallengeMethod || 'S256');
            }
            
            // Add additional parameters
            if (params.additionalParams) {
                for (const [key, value] of Object.entries(params.additionalParams)) {
                    url.searchParams.set(key, value);
                }
            }
            
            return url.toString();
        }

        /**
         * Create token request parameters
         */
        static createTokenRequestParams(params) {
            const formParams = new URLSearchParams();
            
            // Standard parameters
            if (params.grantType) formParams.set('grant_type', params.grantType);
            if (params.code) formParams.set('code', params.code);
            if (params.redirectUri) formParams.set('redirect_uri', params.redirectUri);
            if (params.clientId) formParams.set('client_id', params.clientId);
            if (params.clientSecret) formParams.set('client_secret', params.clientSecret);
            
            // PKCE parameter
            if (params.codeVerifier) formParams.set('code_verifier', params.codeVerifier);
            
            // Device flow parameters
            if (params.deviceCode) formParams.set('device_code', params.deviceCode);
            
            // Refresh token parameters
            if (params.refreshToken) formParams.set('refresh_token', params.refreshToken);
            
            return formParams;
        }

        /**
         * Secure random string generator
         */
        static generateSecureRandomString(length = 32) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            return this.base64URLEncode(array);
        }

        /**
         * Create secure session key
         */
        static generateSessionKey() {
            return this.generateSecureRandomString(32);
        }

        /**
         * Hash string using SHA-256
         */
        static async hashString(input) {
            const encoder = new TextEncoder();
            const data = encoder.encode(input);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return this.base64URLEncode(new Uint8Array(digest));
        }

        /**
         * Create fingerprint for OAuth configuration
         */
        static async createConfigFingerprint(config) {
            const configString = JSON.stringify({
                authorizationUrl: config.authorizationUrl,
                tokenUrl: config.tokenUrl,
                scope: config.scope,
                clientId: config.clientId
            });
            
            return await this.hashString(configString);
        }

        /**
         * Validate OAuth configuration
         */
        static validateOAuthConfig(config) {
            const required = ['authorizationUrl', 'tokenUrl', 'clientId'];
            const missing = required.filter(field => !config[field]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required OAuth configuration: ${missing.join(', ')}`);
            }
            
            // Validate URLs
            try {
                new URL(config.authorizationUrl);
                new URL(config.tokenUrl);
            } catch (error) {
                throw new Error('Invalid OAuth URLs in configuration');
            }
            
            return true;
        }
    }

    // Public API
    return {
        PKCEHelper
    };
})();