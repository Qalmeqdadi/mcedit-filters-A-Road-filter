/**
 * Hosted single-file build support. The shared/hosted page runs in a sandbox
 * where file downloads and printing are blocked, so exports copy to the
 * clipboard instead. In the normal Next.js app these helpers are no-ops.
 */
declare global {
  interface Window {
    __JSC_HOSTED__?: boolean;
    __JSC_MAPLIBRE_WORKER__?: string;
  }
}

export const isHosted = () => typeof window !== "undefined" && window.__JSC_HOSTED__ === true;
export const hostedWorkerUrl = () => (typeof window !== "undefined" ? window.__JSC_MAPLIBRE_WORKER__ : undefined);

export interface ToastDetail {
  message: string;
  /** text shown for manual copy when the clipboard is unavailable */
  fallback?: string;
}

export function toast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent<ToastDetail>("jsc-toast", { detail }));
}

/** Copy text to the clipboard (hosted mode) and tell the user what happened. */
export async function copyExport(filename: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ message: `${filename} copied to the clipboard — paste it into Excel or a text editor. (Downloads are disabled in the shared view.)` });
  } catch {
    toast({ message: `Copy ${filename} below (downloads and clipboard are blocked here).`, fallback: text });
  }
}
