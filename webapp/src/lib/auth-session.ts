export type AuthSession = {
  userId: string;
  email: string;
  displayName: string;
  canEdit: boolean;
  expiresAt: number;
};

export const authCookieName = "scc_admin_session";

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(message: string) {
  const secret = getSessionSecret();

  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(session: Omit<AuthSession, "expiresAt">) {
  const payload: AuthSession = {
    ...session,
    expiresAt: Date.now() + 1000 * 60 * 60 * 12
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await hmac(encodedPayload);

  if (!expectedSignature || signature !== expectedSignature) {
    return null;
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const session = JSON.parse(decoded) as AuthSession;

    if (!session.expiresAt || session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
