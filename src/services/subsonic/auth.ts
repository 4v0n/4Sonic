import { hashString } from "../../utils/hash";

const DEFAULT_SALT_LENGTH = 12;

const SALT_CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const getCrypto = (): Crypto | null => {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  if (typeof crypto !== "undefined") {
    return crypto;
  }
  return null;
};

export const normalizeServerUrl = (url: string): string => {
  let sanitized = url.trim();
  if (!/^https?:\/\//i.test(sanitized)) {
    sanitized = `https://${sanitized}`;
  }
  if (sanitized.endsWith("/")) {
    sanitized = sanitized.replace(/\/+$/, "");
  }
  return sanitized;
};

export const createSalt = (length = DEFAULT_SALT_LENGTH): string => {
  const generator = getCrypto();
  if (generator) {
    const data = new Uint32Array(length);
    generator.getRandomValues(data);
    return Array.from(data, (value) => SALT_CHARACTERS[value % SALT_CHARACTERS.length]).join("");
  }
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * SALT_CHARACTERS.length);
    result += SALT_CHARACTERS[randomIndex];
  }
  return result;
};

export const createTokenFromPassword = (password: string, salt: string): string => {
  return hashString(`${password}${salt}`);
};
