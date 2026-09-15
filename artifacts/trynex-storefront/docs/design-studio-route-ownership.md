# Design Studio route ownership

The single supported customer Design Studio entry point is `/design-studio`. It mounts `src/pages/studio/DesignStudioV2.tsx`, which is the only customer-facing implementation evaluated by the Smart v10.3 release verifier.

The former `/design-studio-v1` and `/design-studio-v2` URLs are retained only as compatibility redirects to `/design-studio`. They must not become independent customer editor experiences. The historic `src/pages/DesignStudio.tsx` source remains unreferenced by the router as a review/reference artifact while older integrations are retired; changes to it do not constitute a Smart v10.3 delivery. Any future reactivation requires an explicit route-ownership review and extension of `verify-design-studio-capabilities.mjs`.

The managed Manus prototype is a separate internal validation workspace. It is not a public Trynext route, does not provide mockup assets to the production repository, and must not be used to claim that production behavior is deployed.
