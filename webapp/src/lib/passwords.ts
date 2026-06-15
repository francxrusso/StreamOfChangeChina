import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const algorithm = "sccpbkdf2";
const iterations = 310000;
const keyLength = 32;
const digest = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("base64url");

  return `${algorithm}$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [storedAlgorithm, storedIterations, salt, hash] = storedHash.split("$");

  if (storedAlgorithm !== algorithm || !storedIterations || !salt || !hash) {
    return false;
  }

  const candidate = pbkdf2Sync(password, salt, Number(storedIterations), keyLength, digest);
  const expected = Buffer.from(hash, "base64url");

  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
