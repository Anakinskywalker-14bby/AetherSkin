/**
 * Subscribe to a MediaQueryList change. iOS Safari before 14 only has the
 * old addListener/removeListener API; calling addEventListener there throws,
 * which used to stop the footer video from ever starting on older iPhones.
 */
export function onMediaChange(mql: MediaQueryList, fn: () => void): () => void {
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", fn);
    return () => mql.removeEventListener("change", fn);
  }
  mql.addListener(fn);
  return () => mql.removeListener(fn);
}
