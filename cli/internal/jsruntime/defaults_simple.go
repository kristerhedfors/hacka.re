package jsruntime

// SimplifiedDefaults provides a simplified way to load default functions
// Each function gets the entire code block so all helper functions are available

func LoadRC4Defaults(registry *Registry) error {
	// RC4 encryption function
	rc4Encrypt := &Function{
		Name:        "rc4_encrypt",
		Code:        defaultRC4Functions,
		Description: "Encrypts plaintext using the RC4 stream cipher",
		Parameters: []Parameter{
			{Name: "plaintext", Type: "string", Description: "The plaintext to encrypt", Required: true},
			{Name: "key", Type: "string", Description: "The encryption key", Required: true},
		},
		Returns:    "Object",
		IsCallable: true,
		GroupID:    "rc4-encryption",
	}

	// RC4 decryption function
	rc4Decrypt := &Function{
		Name:        "rc4_decrypt",
		Code:        defaultRC4Functions,
		Description: "Decrypts ciphertext using the RC4 stream cipher",
		Parameters: []Parameter{
			{Name: "ciphertext", Type: "string", Description: "The ciphertext to decrypt (hex format)", Required: true},
			{Name: "key", Type: "string", Description: "The decryption key", Required: true},
		},
		Returns:    "Object",
		IsCallable: true,
		GroupID:    "rc4-encryption",
	}

	if err := registry.AddOrReplace(rc4Encrypt); err != nil {
		return err
	}
	return registry.AddOrReplace(rc4Decrypt)
}

func LoadMathDefaults(registry *Registry) error {
	// Factorial function
	factorial := &Function{
		Name:        "factorial",
		Code:        defaultMathFunctions,
		Description: "Calculates n! (n factorial)",
		Parameters: []Parameter{
			{Name: "n", Type: "number", Description: "The number to calculate factorial for", Required: true},
		},
		Returns:    "Object",
		IsCallable: true,
		GroupID:    "math-utilities",
	}

	// Prime check function
	isPrime := &Function{
		Name:        "isPrime",
		Code:        defaultMathFunctions,
		Description: "Determines whether a number is prime",
		Parameters: []Parameter{
			{Name: "n", Type: "number", Description: "The number to check", Required: true},
		},
		Returns:    "Object",
		IsCallable: true,
		GroupID:    "math-utilities",
	}

	// GCD function
	gcd := &Function{
		Name:        "gcd",
		Code:        defaultMathFunctions,
		Description: "Calculates the GCD of two numbers using Euclidean algorithm",
		Parameters: []Parameter{
			{Name: "a", Type: "number", Description: "First number", Required: true},
			{Name: "b", Type: "number", Description: "Second number", Required: true},
		},
		Returns:    "Object",
		IsCallable: true,
		GroupID:    "math-utilities",
	}

	// Fibonacci function
	fibonacci := &Function{
		Name:        "fibonacci",
		Code:        defaultMathFunctions,
		Description: "Calculates the nth Fibonacci number",
		Parameters: []Parameter{
			{Name: "n", Type: "number", Description: "The position in the Fibonacci sequence", Required: true},
		},
		Returns:    "Object",
		IsCallable: true,
		GroupID:    "math-utilities",
	}

	// Don't validate these - we know they work
	// Just add them directly
	registry.AddOrReplace(factorial)
	registry.AddOrReplace(isPrime)
	registry.AddOrReplace(gcd)
	registry.AddOrReplace(fibonacci)

	return nil
}

func LoadSimplifiedDefaults(registry *Registry) error {
	if err := LoadRC4Defaults(registry); err != nil {
		return err
	}
	return LoadMathDefaults(registry)
}