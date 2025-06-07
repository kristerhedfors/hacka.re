#!/bin/bash
#
# Authentication Examples Test Runner
# Tests all authentication methods using libsodium cryptography
#

set -e

echo "🧪 Authentication Examples Test Suite"
echo "Uses libsodium (PyNaCl) cryptographic primitives only"
echo "=================================================="

# Use shared virtual environment from hacka.re project root
echo "🔧 Activating shared virtual environment..."
source ../_venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -e .

# Generate test keys if not present
if [ -z "$SHARED_SECRET" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "🔑 Generating test authentication keys..."
    
    # Generate HMAC shared secret
    if [ -z "$SHARED_SECRET" ]; then
        export SHARED_SECRET=$(python -c "from src.crypto_auth import generate_shared_secret; print(generate_shared_secret().hex())")
        echo "✓ Generated HMAC shared secret"
    fi
    
    # Generate Ed25519 keypair
    if [ -z "$PRIVATE_KEY" ] || [ -z "$CLIENT_PUBLIC_KEY" ]; then
        KEYPAIR=$(python -c "from src.crypto_auth import generate_ed25519_keypair; private, public = generate_ed25519_keypair(); print(f'{private},{public}')")
        export PRIVATE_KEY=$(echo $KEYPAIR | cut -d',' -f1)
        export CLIENT_PUBLIC_KEY=$(echo $KEYPAIR | cut -d',' -f2)
        echo "✓ Generated Ed25519 keypair"
    fi
fi

echo ""
echo "🔐 Authentication Keys:"
echo "   HMAC Secret: ${SHARED_SECRET:0:16}..."
echo "   Ed25519 Private: ${PRIVATE_KEY:0:16}..."
echo "   Ed25519 Public: ${CLIENT_PUBLIC_KEY:0:16}..."

# Run unit tests
echo ""
echo "🧪 Running unit tests..."
python -m pytest src/tests/ -v

# Start servers in background for integration tests
echo ""
echo "🚀 Starting authentication servers..."

# Kill any existing servers on our ports
lsof -ti:8002 | xargs kill -9 2>/dev/null || true
lsof -ti:8003 | xargs kill -9 2>/dev/null || true

# Start HMAC server on port 8002
SHARED_SECRET=$SHARED_SECRET HMAC_PORT=8002 python src/examples/hmac_server.py &
HMAC_PID=$!
echo "   HMAC server started (PID: $HMAC_PID) on port 8002"

# Start Ed25519 server on port 8003
CLIENT_PUBLIC_KEY=$CLIENT_PUBLIC_KEY ED25519_PORT=8003 python src/examples/ed25519_server.py &
ED25519_PID=$!
echo "   Ed25519 server started (PID: $ED25519_PID) on port 8003"

# Wait for servers to start
sleep 3

# Check if servers are actually running
echo "   Checking server status..."
if ! curl -s http://127.0.0.1:8002/health > /dev/null; then
    echo "   ⚠️  HMAC server may not be responding on port 8002"
fi

if ! curl -s http://127.0.0.1:8003/health > /dev/null; then
    echo "   ⚠️  Ed25519 server may not be responding on port 8003"
fi

# Run integration tests
echo ""
echo "🔗 Running integration tests..."
SHARED_SECRET=$SHARED_SECRET PRIVATE_KEY=$PRIVATE_KEY python src/examples/test_auth.py --hmac-url http://127.0.0.1:8002 --ed25519-url http://127.0.0.1:8003

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $HMAC_PID $ED25519_PID 2>/dev/null || true
wait 2>/dev/null || true

echo ""
echo "✅ All tests completed successfully!"
echo "🔐 libsodium authentication methods verified"
echo ""
echo "📚 Next steps:"
echo "1. Review authentication code in src/crypto_auth.py"
echo "2. Study server implementations for integration patterns"
echo "3. Generate production keys with: python -m src.keygen"
echo "4. Integrate authentication methods into your applications"
echo ""
echo "💡 Environment:"
echo "- Uses shared hacka.re virtual environment (../_venv)"
echo "- Install auth_examples with: pip install -e ."