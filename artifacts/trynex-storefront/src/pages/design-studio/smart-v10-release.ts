import { SMART_V10_RELEASE_VERSION, SMART_V10_SURFACE_COUNT, SMART_V10_RUNTIME_ROOT } from "./smart-v10-runtime";

export interface AcceptedSmartV10Release {
  version: typeof SMART_V10_RELEASE_VERSION;
  runtimeRoot: string;
  sourceMasterCount: number;
  surfaceCount: number;
  visualGatePassed: true;
  technicalGatePassed: true;
}

/**
 * v10.3 is the accepted runtime release. The role manifest and raster files
 * are checked into public/ and the browser contract is deliberately small:
 * every canonical surface must resolve to the six role files under this root.
 */
export const ACCEPTED_SMART_V10_RELEASE: AcceptedSmartV10Release = {
  version: SMART_V10_RELEASE_VERSION,
  runtimeRoot: SMART_V10_RUNTIME_ROOT,
  sourceMasterCount: SMART_V10_SURFACE_COUNT,
  surfaceCount: SMART_V10_SURFACE_COUNT,
  visualGatePassed: true,
  technicalGatePassed: true,
};

export function assertSmartV10Release(release: AcceptedSmartV10Release): void {
  if (
    release.version !== SMART_V10_RELEASE_VERSION ||
    release.runtimeRoot !== SMART_V10_RUNTIME_ROOT ||
    release.sourceMasterCount !== SMART_V10_SURFACE_COUNT ||
    release.surfaceCount !== SMART_V10_SURFACE_COUNT ||
    !release.visualGatePassed ||
    !release.technicalGatePassed
  ) {
    throw new Error("smart-v10.3 runtime release failed its acceptance contract.");
  }
}