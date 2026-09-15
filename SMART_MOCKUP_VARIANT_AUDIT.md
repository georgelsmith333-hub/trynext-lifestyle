# Smart Mockup Variant Audit

## Water-bottle mismatch confirmed

The shop product image at `artifacts/trynex-storefront/public/products/water-bottle.png` is a tall, rounded, dark/forest-green bottle with a simple cylindrical screw cap and no carabiner or loop.

The current Design Studio candidate at `artifacts/trynex-storefront/public/mockups/white-waterbottle-real.png` is a different white sports bottle with a black loop cap and silver carabiner, placed on a warm lifestyle background. It must not be used for the product being sold.

The current new asset reference `/assets/mockups/bottle_1.png` also comes from the generated bottle batch and has not yet been verified against the sold bottle silhouette. It must not be treated as the correct master until compared with the product image.

## Consequences

1. The product page and Design Studio are currently not guaranteed to represent the same bottle.
2. A real PSD/PSB-style system requires the correct sold-bottle master, transparent cutout, print-zone mask, displacement map, shadow map, highlight map, and export configuration to all share the same geometry.
3. Existing generic source-kit files and generated bottle files should be retained as candidates but not wired as the final bottle until the silhouette is reconciled.

## Required next work

- Build the water-bottle mockup from the actual `water-bottle.png` silhouette or an approved high-resolution equivalent of the same rounded screw-cap bottle.
- Create synchronized front/back or single-view assets: base, transparent cutout, printable-region alpha mask, displacement map, shadow map, highlight map, and metadata.
- Implement an explicit asset manifest so the product page, Design Studio, cart thumbnail, and export path cannot select different bottle families.
- Treat PSD/PSB as authoring/source files and browser assets as derived files; do not claim browser PNG layers are native Photoshop Smart Objects.

## Candidate comparison

`public/assets/mockups/bottle_1.png` is a silver double-wall bottle with a straight shoulder and plain screw cap. It also does not match the sold green bottle.

`public/mockups/source-kit/waterbottle-white-front.png` is a white bottle with a black loop/carabiner cap and therefore matches the previously rejected sports-bottle family, not the sold green rounded screw-cap bottle.

The correct mockup master must be rebuilt from the sold-bottle silhouette shown in `public/products/water-bottle.png`, rather than reusing either candidate.
