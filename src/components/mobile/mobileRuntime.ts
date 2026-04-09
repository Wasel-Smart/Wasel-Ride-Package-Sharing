export function getOnlineState(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

