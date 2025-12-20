
/**
 * ApnaWalk Crypto Service
 * Implements E2EE using RSA-OAEP (Web Crypto API)
 */

const KEY_ALGO = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    KEY_ALGO,
    true,
    ["encrypt", "decrypt"]
  );
  
  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  
  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
  };
}

export async function encryptMessage(text: string, publicKeyBase64: string) {
  try {
    const binaryKey = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      binaryKey,
      KEY_ALGO,
      false,
      ["encrypt"]
    );

    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      encoder.encode(text)
    );

    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  } catch (e) {
    console.error("Encryption error", e);
    return text; // Fallback if encryption fails
  }
}

export async function decryptMessage(encryptedBase64: string, privateKeyBase64: string) {
  try {
    const binaryKey = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      KEY_ALGO,
      false,
      ["decrypt"]
    );

    const binaryData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      binaryData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    console.warn("Decryption failed - message might be unencrypted or key mismatch");
    return "[Encrypted Message]"; 
  }
}
