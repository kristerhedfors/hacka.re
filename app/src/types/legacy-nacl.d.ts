declare global {
  interface Window {
    nacl?: {
      randomBytes(length: number): Uint8Array;
      hash(data: Uint8Array): Uint8Array;
      secretbox: {
        (message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
        open(cipher: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;
      };
      util: {
        decodeUTF8(value: string): Uint8Array;
        encodeUTF8(value: Uint8Array): string;
      };
    };
  }
}

export {};
