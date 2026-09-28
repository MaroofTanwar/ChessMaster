const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const SQUARE = /^[a-h][1-8]$/;

export const isSafeId = (value) => typeof value === 'string' && SAFE_ID.test(value);
export const isSquare = (value) => typeof value === 'string' && SQUARE.test(value.toLowerCase());
export const isRoomId = (value) => typeof value === 'string' && /^CHESS-[A-HJ-NP-Z2-9]{5}$/.test(value.trim().toUpperCase());
export const isFenInput = (value) => typeof value === 'string' && value.length >= 15 && value.length <= 256;

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
