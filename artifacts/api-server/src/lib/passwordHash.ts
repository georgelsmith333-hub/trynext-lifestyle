import * as argon2 from "@node-rs/argon2";
import * as crypto from "crypto";
import { promisify } from "util";

const pbkdf2 = promisify(crypto.pbkdf2);

// Algorithm.Argon2id = 2 (the default for @node-rs/argon2; avoids ambient
// const enum access which is incompatible with isolatedModules).
const ARGON2_OPTIONS: argon2.Options = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  algorithm: 2,
};

export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPasswordArgon2(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// PBKDF2-SHA256 verification — compatible with the CF Worker implementation.
// Format: $pbkdf2-sha256$<iterations>$<saltHex>$<hashHex>
// ---------------------------------------------------------------------------
export function isPbkdf2Hash(hash: string): boolean {
  return hash.startsWith("$pbkdf2-sha256$");
}

export async function verifyPasswordPbkdf2(encoded: string, password: string): Promise<boolean> {
  try {
    const parts = encoded.split("$");
    if (parts.length !== 5 || parts[1] !== "pbkdf2-sha256") return false;
    const iterations = parseInt(parts[2], 10);
    const salt = Buffer.from(parts[3], "hex");
    const expected = Buffer.from(parts[4], "hex");
    const candidate = await pbkdf2(password, salt, iterations, expected.length, "sha256");
    if (candidate.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) diff |= candidate[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

export function hashPasswordSha256(password: string, salt: string): string {
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

export function isSha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

export function isArgon2Hash(hash: string): boolean {
  return hash.startsWith("$argon2");
}

export async function verifyPasswordAny(
  hash: string,
  password: string,
  sha256Salt: string,
): Promise<boolean> {
  if (isPbkdf2Hash(hash)) {
    return verifyPasswordPbkdf2(hash, password);
  }
  if (isArgon2Hash(hash)) {
    return verifyPasswordArgon2(hash, password);
  }
  if (isSha256Hash(hash)) {
    return hashPasswordSha256(password, sha256Salt) === hash;
  }
  return false;
}
