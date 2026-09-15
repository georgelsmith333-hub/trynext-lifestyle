/**
 * Compatibility entry point for historic imports.
 *
 * The single supported customer Studio is `studio/DesignStudioV2`, mounted at
 * `/design-studio`. Re-exporting it prevents this legacy file from becoming a
 * divergent product experience outside the active Smart v10.3 release contract.
 */
export { default } from "./studio/DesignStudioV2";
