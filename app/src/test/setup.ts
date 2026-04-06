import "@testing-library/jest-dom/vitest";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

Object.defineProperty(window, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function pseudoHash(input: Uint8Array) {
  const output = new Uint8Array(64);
  for (let index = 0; index < output.length; index += 1) {
    const source = input.length ? input[index % input.length] : index;
    output[index] = (source + index * 17) % 256;
  }
  return output;
}

function pseudoSeal(message: Uint8Array, nonce: Uint8Array, key: Uint8Array) {
  const auth = new Uint8Array(16);
  for (let index = 0; index < auth.length; index += 1) {
    auth[index] = (key[index % key.length] ^ nonce[index % nonce.length] ^ message.length) & 0xff;
  }

  const payload = new Uint8Array(auth.length + message.length);
  payload.set(auth, 0);

  for (let index = 0; index < message.length; index += 1) {
    payload[auth.length + index] =
      message[index] ^ key[index % key.length] ^ nonce[index % nonce.length];
  }

  return payload;
}

Object.defineProperty(window, "nacl", {
  value: {
    randomBytes(length: number) {
      return Uint8Array.from({ length }, (_, index) => (index * 29 + 7) % 256);
    },
    hash(input: Uint8Array) {
      return pseudoHash(input);
    },
    secretbox(message: Uint8Array, nonce: Uint8Array, key: Uint8Array) {
      return pseudoSeal(message, nonce, key);
    },
    util: {
      decodeUTF8(value: string) {
        return encoder.encode(value);
      },
      encodeUTF8(value: Uint8Array) {
        return decoder.decode(value);
      },
    },
  },
  configurable: true,
});

window.nacl!.secretbox.open = (cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array) => {
  if (cipher.length < 16) {
    return null;
  }

  const message = cipher.slice(16);
  const output = new Uint8Array(message.length);
  for (let index = 0; index < message.length; index += 1) {
    output[index] = message[index] ^ key[index % key.length] ^ nonce[index % nonce.length];
  }
  return output;
};

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: async () => undefined,
  },
  configurable: true,
});
