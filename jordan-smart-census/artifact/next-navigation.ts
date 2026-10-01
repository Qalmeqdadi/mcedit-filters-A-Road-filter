import { navigate, useLocation } from "./router";

export function useRouter() {
  return { push: navigate, replace: navigate, back: () => undefined, refresh: () => undefined, prefetch: () => undefined };
}

export function usePathname() {
  return useLocation();
}
