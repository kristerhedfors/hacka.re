#!/bin/bash

echo "==================================="
echo "hacka.re Function Call Demo"
echo "==================================="
echo

echo "The 'call' command executes functions with command-line arguments"
echo "It automatically converts arguments to the correct types"
echo

echo "1. Encrypt text with RC4:"
echo "   Command: ./hacka.re function call rc4_encrypt \"Hello World\" \"mykey\""
result=$(./hacka.re function call rc4_encrypt "Hello World" "mykey")
echo "   Result: $result"
echo

echo "2. Decrypt the ciphertext:"
echo "   Command: ./hacka.re function call rc4_decrypt $result \"mykey\""
decrypted=$(./hacka.re function call rc4_decrypt $result "mykey")
echo "   Result: $decrypted"
echo

echo "3. Calculate factorial of 7:"
echo "   Command: ./hacka.re function call factorial 7"
result=$(./hacka.re function call factorial 7)
echo "   Result: $result"
echo

echo "4. Check if 23 is prime:"
echo "   Command: ./hacka.re function call isPrime 23"
result=$(./hacka.re function call isPrime 23)
echo "   Result: $result"
echo

echo "5. Find GCD of 120 and 45:"
echo "   Command: ./hacka.re function call gcd 120 45"
result=$(./hacka.re function call gcd 120 45)
echo "   Result: $result"
echo

echo "6. Get 15th Fibonacci number:"
echo "   Command: ./hacka.re function call fibonacci 15"
result=$(./hacka.re function call fibonacci 15)
echo "   Result: $result"
echo

echo "==================================="
echo "Chaining Functions in Shell Scripts"
echo "==================================="
echo

# Example of using functions in a shell pipeline
echo "Encrypt a message and save to file:"
message="Secret message for testing"
key="password123"
echo "   Original: $message"
encrypted=$(./hacka.re function call rc4_encrypt "$message" "$key")
echo "   Encrypted: $encrypted"
echo $encrypted > /tmp/encrypted.txt
echo "   Saved to: /tmp/encrypted.txt"
echo

echo "Read from file and decrypt:"
encrypted_from_file=$(cat /tmp/encrypted.txt)
decrypted=$(./hacka.re function call rc4_decrypt "$encrypted_from_file" "$key")
echo "   Decrypted: $decrypted"
echo

echo "==================================="
echo "Using in Shell Conditionals"
echo "==================================="
echo

# Example of using boolean results in shell conditionals
for num in 11 12 13 14 15; do
    if ./hacka.re function call isPrime $num 2>/dev/null | grep -q "true"; then
        echo "   $num is prime"
    else
        echo "   $num is not prime"
    fi
done

echo
echo "==================================="
echo "Demo Complete!"
echo "==================================="