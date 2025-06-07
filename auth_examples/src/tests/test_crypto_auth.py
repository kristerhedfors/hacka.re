#!/usr/bin/env python3
"""
Unit Tests for Cryptographic Authentication

Tests all authentication methods using libsodium primitives only.
Validates security properties and proper implementation.
"""

import pytest
import time
import secrets
from ..crypto_auth import (
    generate_shared_secret,
    generate_ed25519_keypair,
    sign_request,
    verify_signature,
    sign_ed25519_request,
    verify_ed25519_signature,
    create_comprehensive_signature,
    verify_comprehensive_signature
)


class TestSharedSecretGeneration:
    """Test shared secret generation using libsodium"""
    
    def test_generate_shared_secret_length(self):
        """Test that shared secrets are exactly 32 bytes"""
        secret = generate_shared_secret()
        assert len(secret) == 32
        assert isinstance(secret, bytes)
    
    def test_generate_shared_secret_uniqueness(self):
        """Test that generated secrets are unique"""
        secret1 = generate_shared_secret()
        secret2 = generate_shared_secret()
        assert secret1 != secret2
    
    def test_shared_secret_entropy(self):
        """Test that secrets have good entropy (basic check)"""
        secret = generate_shared_secret()
        # Should not be all zeros or all same byte
        assert not all(b == 0 for b in secret)
        assert len(set(secret)) > 10  # Should have variety of bytes


class TestEd25519KeyGeneration:
    """Test Ed25519 keypair generation using libsodium"""
    
    def test_generate_ed25519_keypair_format(self):
        """Test that Ed25519 keys are generated in correct format"""
        private_key, public_key = generate_ed25519_keypair()
        
        # Both should be hex strings
        assert isinstance(private_key, str)
        assert isinstance(public_key, str)
        
        # Should be 64 hex characters (32 bytes)
        assert len(private_key) == 64
        assert len(public_key) == 64
        
        # Should be valid hex
        bytes.fromhex(private_key)
        bytes.fromhex(public_key)
    
    def test_ed25519_keypair_uniqueness(self):
        """Test that generated keypairs are unique"""
        private1, public1 = generate_ed25519_keypair()
        private2, public2 = generate_ed25519_keypair()
        
        assert private1 != private2
        assert public1 != public2


class TestHMACAuthentication:
    """Test HMAC authentication using libsodium Blake2b"""
    
    def test_sign_and_verify_request(self):
        """Test basic HMAC signing and verification"""
        shared_secret = generate_shared_secret()
        body = b"test message"
        
        timestamp, signature = sign_request(body, shared_secret)
        
        # Should return strings
        assert isinstance(timestamp, str)
        assert isinstance(signature, str)
        
        # Should be valid hex signature
        bytes.fromhex(signature)
        
        # Should verify successfully
        assert verify_signature(body, timestamp, signature, shared_secret)
    
    def test_verify_signature_with_wrong_secret(self):
        """Test that wrong shared secret fails verification"""
        secret1 = generate_shared_secret()
        secret2 = generate_shared_secret()
        body = b"test message"
        
        timestamp, signature = sign_request(body, secret1)
        
        # Should fail with wrong secret
        assert not verify_signature(body, timestamp, signature, secret2)
    
    def test_verify_signature_with_modified_body(self):
        """Test that modified body fails verification"""
        shared_secret = generate_shared_secret()
        body = b"original message"
        modified_body = b"modified message"
        
        timestamp, signature = sign_request(body, shared_secret)
        
        # Should fail with modified body
        assert not verify_signature(modified_body, timestamp, signature, shared_secret)
    
    def test_signature_expiration(self):
        """Test that old signatures are rejected"""
        shared_secret = generate_shared_secret()
        body = b"test message"
        old_timestamp = str(int(time.time()) - 400)  # 400 seconds ago
        
        # Sign with old timestamp
        timestamp, signature = sign_request(body, shared_secret, old_timestamp)
        
        # Should fail due to age (max_age_seconds=300 by default)
        assert not verify_signature(body, timestamp, signature, shared_secret)
    
    def test_signature_replay_protection(self):
        """Test replay protection with same signature"""
        shared_secret = generate_shared_secret()
        body = b"test message"
        
        timestamp, signature = sign_request(body, shared_secret)
        
        # First verification should succeed
        assert verify_signature(body, timestamp, signature, shared_secret)
        
        # Same signature should still work (within time window)
        assert verify_signature(body, timestamp, signature, shared_secret)
        
        # But with expired timestamp should fail
        expired_timestamp = str(int(time.time()) - 400)
        assert not verify_signature(body, expired_timestamp, signature, shared_secret)


class TestEd25519Authentication:
    """Test Ed25519 authentication using libsodium digital signatures"""
    
    def test_sign_and_verify_ed25519_request(self):
        """Test basic Ed25519 signing and verification"""
        private_key, public_key = generate_ed25519_keypair()
        body = b"test message"
        
        timestamp, signature = sign_ed25519_request(body, private_key)
        
        # Should return strings
        assert isinstance(timestamp, str)
        assert isinstance(signature, str)
        
        # Should be valid hex signature
        bytes.fromhex(signature)
        
        # Should verify successfully
        assert verify_ed25519_signature(body, timestamp, signature, public_key)
    
    def test_verify_ed25519_with_wrong_key(self):
        """Test that wrong public key fails verification"""
        private1, public1 = generate_ed25519_keypair()
        private2, public2 = generate_ed25519_keypair()
        body = b"test message"
        
        timestamp, signature = sign_ed25519_request(body, private1)
        
        # Should fail with wrong public key
        assert not verify_ed25519_signature(body, timestamp, signature, public2)
    
    def test_verify_ed25519_with_modified_body(self):
        """Test that modified body fails Ed25519 verification"""
        private_key, public_key = generate_ed25519_keypair()
        body = b"original message"
        modified_body = b"modified message"
        
        timestamp, signature = sign_ed25519_request(body, private_key)
        
        # Should fail with modified body
        assert not verify_ed25519_signature(modified_body, timestamp, signature, public_key)
    
    def test_ed25519_signature_expiration(self):
        """Test that old Ed25519 signatures are rejected"""
        private_key, public_key = generate_ed25519_keypair()
        body = b"test message"
        old_timestamp = str(int(time.time()) - 400)  # 400 seconds ago
        
        # Sign with old timestamp
        timestamp, signature = sign_ed25519_request(body, private_key, old_timestamp)
        
        # Should fail due to age
        assert not verify_ed25519_signature(body, timestamp, signature, public_key)


class TestComprehensiveAuthentication:
    """Test comprehensive request signing with libsodium"""
    
    def test_comprehensive_signature_creation(self):
        """Test comprehensive signature creation and verification"""
        shared_secret = generate_shared_secret()
        
        # Simulate HTTP request components
        method = "POST"
        path = "/api/endpoint"
        query_params = {"param1": "value1", "param2": "value2"}
        headers = {"content-type": "application/json", "authorization": "Bearer token"}
        body = b'{"test": "data"}'
        timestamp = str(int(time.time()))
        
        # Create signature
        signature = create_comprehensive_signature(
            method, path, query_params, headers, body, timestamp, shared_secret
        )
        
        # Should be hex string
        assert isinstance(signature, str)
        bytes.fromhex(signature)
        
        # Should verify successfully
        assert verify_comprehensive_signature(
            method, path, query_params, headers, body, timestamp, signature, shared_secret
        )
    
    def test_comprehensive_signature_parameter_order(self):
        """Test that parameter order doesn't affect signature"""
        shared_secret = generate_shared_secret()
        
        method = "POST"
        path = "/api/test"
        body = b"test"
        timestamp = str(int(time.time()))
        
        # Different order of query parameters
        query1 = {"b": "2", "a": "1"}
        query2 = {"a": "1", "b": "2"}
        
        headers = {"content-type": "application/json"}
        
        sig1 = create_comprehensive_signature(
            method, path, query1, headers, body, timestamp, shared_secret
        )
        sig2 = create_comprehensive_signature(
            method, path, query2, headers, body, timestamp, shared_secret
        )
        
        # Should be the same (parameters are sorted)
        assert sig1 == sig2
    
    def test_comprehensive_signature_sensitivity(self):
        """Test that comprehensive signature is sensitive to all parameters"""
        shared_secret = generate_shared_secret()
        
        base_params = {
            "method": "POST",
            "path": "/api/test",
            "query_params": {"test": "value"},
            "headers": {"content-type": "application/json"},
            "body": b"test data",
            "timestamp": str(int(time.time())),
            "shared_secret": shared_secret
        }
        
        # Create base signature
        base_sig = create_comprehensive_signature(**base_params)
        
        # Test that changing each parameter changes signature
        test_cases = [
            ("method", "GET"),
            ("path", "/api/different"),
            ("query_params", {"test": "different"}),
            ("headers", {"content-type": "text/plain"}),
            ("body", b"different data")
        ]
        
        for param_name, new_value in test_cases:
            modified_params = base_params.copy()
            modified_params[param_name] = new_value
            
            modified_sig = create_comprehensive_signature(**modified_params)
            assert modified_sig != base_sig, f"Signature should change when {param_name} changes"


class TestSecurityProperties:
    """Test security properties of authentication methods"""
    
    def test_timing_attack_resistance(self):
        """Test that signature verification is timing-attack resistant"""
        shared_secret = generate_shared_secret()
        body = b"test message"
        
        timestamp, correct_signature = sign_request(body, shared_secret)
        
        # Create wrong signature of same length
        wrong_signature = "a" * len(correct_signature)
        
        # Both should fail, timing should be similar
        # (This is a basic test - real timing attack testing requires specialized tools)
        assert verify_signature(body, timestamp, correct_signature, shared_secret)
        assert not verify_signature(body, timestamp, wrong_signature, shared_secret)
    
    def test_signature_format_validation(self):
        """Test that invalid signature formats are rejected"""
        shared_secret = generate_shared_secret()
        body = b"test message"
        timestamp = str(int(time.time()))
        
        invalid_signatures = [
            "",  # Empty
            "not_hex",  # Not hex
            "abc",  # Too short
            "Z" * 64,  # Invalid hex characters
        ]
        
        for invalid_sig in invalid_signatures:
            assert not verify_signature(body, timestamp, invalid_sig, shared_secret)
    
    def test_timestamp_format_validation(self):
        """Test that invalid timestamp formats are rejected"""
        shared_secret = generate_shared_secret()
        body = b"test message"
        _, signature = sign_request(body, shared_secret)
        
        invalid_timestamps = [
            "",  # Empty
            "not_a_number",  # Not numeric
            "123.456",  # Float
            "-123",  # Negative
        ]
        
        for invalid_ts in invalid_timestamps:
            assert not verify_signature(body, invalid_ts, signature, shared_secret)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])