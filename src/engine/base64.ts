/**
 * Base64 encoding — manual, dependency-free, works in Node and browsers alike.
 * Pure functions — unit-tested.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out +=
      ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!;
  }
  const rem = len - i;
  if (rem === 1) {
    const n = bytes[i]! << 16;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + '==';
  } else if (rem === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + '=';
  }
  return out;
}

export function bytesToDataUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export interface Base64SizeInfo {
  originalBytes: number;
  base64Chars: number;
  dataUriChars: number;
  overheadRatio: number;
}

export function base64SizeInfo(byteLength: number, mime = 'image/png'): Base64SizeInfo {
  const base64Chars = Math.ceil(byteLength / 3) * 4;
  const header = `data:${mime};base64,`.length;
  const dataUriChars = base64Chars + header;
  return {
    originalBytes: byteLength,
    base64Chars,
    dataUriChars,
    overheadRatio: byteLength > 0 ? dataUriChars / byteLength - 1 : 0,
  };
}
