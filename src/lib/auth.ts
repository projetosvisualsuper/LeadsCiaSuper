const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_super_secret_for_jwt_auth_123456789";

function base64url(buffer: ArrayBuffer | Uint8Array): string {
  const bin = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  let cleaned = str.replace(/-/g, '+').replace(/_/g, '/');
  while (cleaned.length % 4) {
    cleaned += '=';
  }
  const bin = atob(cleaned);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    buf[i] = bin.charCodeAt(i);
  }
  return buf;
}

/**
 * Gera um hash seguro para a senha usando PBKDF2 (compatível com o Edge Runtime)
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  const hashBuffer = new Uint8Array(exported);
  return Array.from(hashBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera um sal aleatório em formato hexadecimal
 */
export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera um token JWT assinado digitalmente usando HMAC-SHA256
 */
export async function generateToken(payload: any): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  
  const encodedHeader = base64url(enc.encode(JSON.stringify(header)));
  const encodedPayload = base64url(enc.encode(JSON.stringify(payload)));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(signatureInput)
  );
  
  return `${signatureInput}.${base64url(signature)}`;
}

/**
 * Verifica se um token JWT é válido e retorna seu payload
 */
export async function verifyToken(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBytes = base64urlDecode(encodedSignature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      enc.encode(signatureInput)
    );
    
    if (!isValid) return null;
    
    const decodedPayload = new TextDecoder().decode(base64urlDecode(encodedPayload));
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error("Token Verification Error:", error);
    return null;
  }
}
