// Browser stand-in for node:crypto, for the backend modules the page runs.
export const randomUUID = (): string => globalThis.crypto.randomUUID();
export const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
