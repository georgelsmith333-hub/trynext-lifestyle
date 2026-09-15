# Mockup Reference Findings — 2026-08-17

The supplied hoodie editor references show a burgundy front/back workflow and a forest front workflow. Both demonstrate the intended product family: pullover hoodie with hood, drawstrings, kangaroo pocket, cuffs, and ribbed hem. The current rendered silhouettes visibly retain white triangular gaps at the lower sleeve edges, indicating incomplete cutout/masking. The displayed chest artwork is a multi-color rectangular design placed on the front, while the editor exposes Front, Back, L.Sleeve, R.Sleeve, and Neck zones.

The canonical rebuild must therefore use one hoodie silhouette and one normalized coordinate frame for every color, with a paired front/back asset for every color and no fallback to a differently shaped source. Protected details must remain visible: hood opening and seams, drawstrings, kangaroo pocket, cuffs, sleeve edges, side seams, and hem. The acceptance test must fail if a color view has a different silhouette, if the back uses a different garment cut, or if transparent regions expose white wedges.

Sources: user-supplied references `/home/ubuntu/upload/pasted_file_z8sADk_image.png` and `/home/ubuntu/upload/pasted_file_OXQ5P2_image.png`.


## Six-family production audit

The active Design Studio V2 runtime is not yet a complete canonical mockup system. The side-by-side asset audit found that the canonical hoodie front/back PNGs visibly contain checkerboard background pixels rather than a clean alpha cutout, making them unsuitable as production assets. The source-kit pairs for T-Shirts, Long Sleeves, Mugs, Caps, and Water Bottles are visually usable as white references but are not yet proven color-complete canonical sets; their geometry and crop contracts differ across families and some pairs have noticeably different framing. The current resolver activates the canonical hoodie pair only for white front/back, while every other family/color/view resolves to `source-kit-v3` paths. This explains why V2 can still show the old or visually inconsistent mockups despite the canonical specification existing.

The live hoodie editor also showed a persisted saved artwork layer that looked like a rectangular color-swatch grid over the chest/back. That is a draft-layer artifact, not evidence that the garment base itself is correct, and it must be isolated from clean mockup regression tests.
