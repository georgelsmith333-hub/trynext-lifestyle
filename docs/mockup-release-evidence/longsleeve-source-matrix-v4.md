# Long Sleeve Source Matrix v4: Corrective Release Evidence

## Purpose

`source-matrix-v4/longsleeve` replaces only the visually defective Long Sleeve v3 browser derivatives. The previous v3 output displayed a duplicate bright-white garment/backing around coloured shirts. The correction is a complete 10-colour by 5-view matrix, not a one-colour patch.

## Source and browser boundary

The editable Long Sleeve masters remain quarantined and are never checked into this repository or served to a customer browser. The verified source archive SHA-256 is:

```text
c2a791188686af587601110ee5ba5ba47c257bbceea7f18223955f6f28f88281
```

The archive passed a full ZIP integrity test. All 50 PSD members then matched the supplied manifest by member name, byte count, and SHA-256. The manifest declares the exact full matrix below.

| Dimension | Declared coverage |
|---|---|
| Colours | White, Black, Charcoal, Heather Grey, Navy, Royal Blue, Forest Green, Burgundy, Red, Sand |
| Views | Front, Back, Left Sleeve, Right Sleeve, Neck Label |
| Source canvas by view | Front/Back: 4000×3500; Sleeves: 900×1650; Neck Label: 1100×1200 |
| Browser assets committed here | 50 JPEG derivatives under `public/mockups/source-matrix-v4/longsleeve/` |

## Corrective export method

Each master was opened non-destructively and composited through its original PSD layer recipe with the provided design Smart Object empty. The browser derivative is a full-canvas RGB JPEG encoded after a Lanczos resize to the exact existing v3 derivative dimensions for that face. There is no pixel erase, crop, reframe, recolour, synthetic fill, generated content, CSS mask, or use of a raw PSD/PSB in browser runtime.

The existing source-derived `normalizedFrame` and print-zone contract is carried forward without numeric change. Hoodie remains on `source-matrix-v3`; no T-shirt, Mug, Cap, Water Bottle, cart, order, admin, analytics, tracking, or smart-v8/v9 release contract was changed.

## Candidate gates passed before integration

The quarantined release candidate was validated for 50/50 record coverage, RGB encoding, exact output dimensions, and source traceability. The two labelled all-matrix visual contact sheets show one coherent coloured garment across every view. An automated bright-backing gate found zero pixels at RGB ≥ 235 in all 14 coloured full-garment Front/Back outputs, where the former duplicate underlayer was most clearly visible.

> This branch is review-only. It must pass the full application, build, resource, preview, and CI/security gates before any merge is considered. A merge still requires separate user authorization.

## Isolated customer-route verification

The actual `/design-studio` route was opened from this branch’s local storefront preview. Selecting **Unisex Long Sleeve** and then **Navy** rendered a single coherent navy garment; the prior bright-white shoulder/side/hem backing was absent. The browser resource log contained only:

```text
/mockups/source-matrix-v4/longsleeve/white/front.jpg
/mockups/source-matrix-v4/longsleeve/navy/front.jpg
```

No `source-matrix-v3/longsleeve` or `smart-v4/longsleeve` request was emitted during that check. This is branch-local verification only and does not alter production.
