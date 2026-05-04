import { timingSafeEqual } from 'node:crypto';

function parseTokens(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getInternalServiceTokens(): string[] {
  return [...new Set([...parseTokens(process.env.INTERNAL_SERVICE_TOKEN), ...parseTokens(process.env.INTERNAL_SERVICE_TOKENS)])];
}

export function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }
  const [scheme, ...rest] = authorizationHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || rest.length === 0) {
    return null;
  }
  const token = rest.join(' ').trim();
  return token || null;
}

export function isInternalServiceTokenValid(token: string): boolean {
  return getInternalServiceTokens().some((candidate) => safeEquals(candidate, token));
}
