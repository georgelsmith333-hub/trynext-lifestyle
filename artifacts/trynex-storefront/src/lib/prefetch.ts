// Lightweight route/asset prefetch helpers.
// Called on hover/touchstart of navigation links so the heavy Design Studio
// chunk (and its default garment mockup images) starts downloading before
// the user actually clicks, eliminating the "hangs on navigation" stall.

let designStudioPrefetched = false;

export function prefetchDesignStudio(): void {
  if (designStudioPrefetched) return;
  designStudioPrefetched = true;
  // Kick off the lazy chunk download.
  import("@/pages/studio/DesignStudioV2").catch(() => {
    // Ignore — the real navigation will retry via lazyWithRetry.
    designStudioPrefetched = false;
  });
  // Warm one canonical front/back pair per product family so the active
  // V2 studio resolves reviewed sources without falling back to retired previews.
  try {
    [
      "/mockups/psd-master-v10/runtime-roles/tshirt/white/front-base.png",
      "/mockups/psd-master-v10/runtime-roles/tshirt/white/back-base.png",
      "/mockups/psd-master-v10/runtime-roles/longsleeve/white/front-base.png",
      "/mockups/psd-master-v10/runtime-roles/longsleeve/white/back-base.png",
      "/mockups/psd-master-v10/runtime-roles/hoodie/white/front-base.png",
      "/mockups/psd-master-v10/runtime-roles/hoodie/white/back-base.png",
      "/mockups/psd-master-v10/runtime-roles/mug/white/front-base.png",
      "/mockups/psd-master-v10/runtime-roles/mug/white/back-base.png",
      "/mockups/psd-master-v10/runtime-roles/cap/white/front-base.png",
      "/mockups/psd-master-v10/runtime-roles/cap/white/back-base.png",
      "/mockups/psd-master-v10/runtime-roles/waterbottle/white/front-base.png",
      "/mockups/psd-master-v10/runtime-roles/waterbottle/white/back-base.png",
    ].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  } catch {
    // Non-critical — ignore.
  }
}
