/**
 * Shared, ref-counted body-scroll lock.
 *
 * Multiple overlays (mobile menu, cart drawer, quick-view modal, image
 * lightbox, spin wheel) each used to set `document.body.style.overflow`
 * directly and independently. Whichever one closed LAST reset it to `''`
 * with no knowledge of the others — so closing overlay B while overlay A
 * was still open silently unlocked scroll under A. Route this through a
 * shared counter instead: scroll only unlocks once every lock is released.
 */
let lockCount = 0;
let previousOverflow: string | null = null;

export function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = previousOverflow ?? "";
      previousOverflow = null;
    }
  };
}
