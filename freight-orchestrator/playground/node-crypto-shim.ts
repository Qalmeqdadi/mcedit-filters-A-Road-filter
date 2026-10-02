// Browser stand-in for node:crypto, used only by the playground bundle.
export const randomUUID = (): string => globalThis.crypto.randomUUID();
