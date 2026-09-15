# Trynext Mockup Master Audit — 2026-08-28

**Audit method:** direct binary inspection with `psd-tools` 1.18.0 + Pillow 12.3.0 + NumPy.
**Auditor script:** `tools/audit_psd_masters.py` (re-runnable, committed).
**Scope:** `attached_assets/trynext-mockup-source-kit/psd/` — 108 master documents, 369 MB.

This file exists so that no future chat has to re-derive these findings. Read it first.

---

## 1. Headline finding — there is no smart-object mockup system

**Every one of the 108 PSD masters contains ZERO smart object layers.**

| Property | Result |
|---|---|
| Documents scanned | 108 |
| Openable | 108 (0 corrupt) |
| Canvas | 1024 × 1024, 8-bit, RGB, 4 channels (uniform) |
| Composite preview present | 108 / 108 |
| Layers per document | 6 (root + 5 named) — identical across all 108 |
| **Smart object layers** | **0 — in all 108 documents** |
| Generic layer names (`Layer 0`…) | 0 |
| "Artwork" layer present by name | 108 / 108 |

The layer stack, identical in all 108 files:

```text
Studio Background — Warm White          pixel   visible   100% opaque, flat #FAF8F5 (std 0.00)
Product Photo — White — Front           pixel   visible   56.2% opaque
Print Zone Mask — …toggle visibility    pixel   HIDDEN    0.0% opaque  (empty)
Artwork — Place Design Here             pixel   visible   0.0% opaque  (empty)
Placement Guide — …toggle visibility    pixel   HIDDEN    0.0% opaque  (empty)
```

### The "Artwork — Place Design Here" layer is empty

Measured on `tshirt-white-front.psd`:

```text
kind              : pixel            <-- NOT a smart object
is_smart_object   : False
bbox              : (0, 0, 1024, 1024)
alpha_nonzero     : 0 / 1,048,576    <-- 0.0%
```

It is a **fully transparent rectangle with a friendly name**. There is no embedded
smart object, no displacement map, no warp mesh, no live artwork linkage. Dropping
a design into it in Photoshop does nothing, because there is nothing there to
replace.

The same is true of `Print Zone Mask` and `Placement Guide` — both 0.0% opaque and
hidden.

**This is the root cause of the reported symptom** — *"the t-shirt short one has
psd psb but it's too bad and not perfectly also works"*. The PSDs are not
smart-object mockups. They are **pre-rendered flat images wearing a mockup-like
layer naming scheme**.

---

## 2. The product photos are not the shipped assets

PSD "Product Photo" layers were compared against the PNGs already shipped in
`artifacts/trynex-storefront/public/mockups/`:

| master | vs public PNG | mean abs diff |
|---|---|---|
| tshirt-white-front | white-tshirt-front.png | 31.69 |
| tshirt-black-front | black-tshirt-front.png | 17.18 |
| hoodie-white-front | white-hoodie-front.png | 49.82 |
| mug-white-front | white-mug-front.png | 77.69 |
| cap-white-front | white-cap-front.png | 63.45 |
| waterbottle-white-front | white-waterbottle-front.png | 50.75 |

None are identical (all > 17), so the PSDs are **not** mere wrappers around the
shipped PNGs — they are a separate, third image set. Three parallel asset
lineages now exist (public PNGs, smart-v4/v7/v8 sets, PSD masters), none
authoritative.

### Color variants are genuinely distinct, not tinted

Luminance correlation of each T-shirt colour against the white master, measured
only inside the product alpha mask:

```text
black      corr = -0.075   lum_ratio = 0.33
grey       corr =  0.017   lum_ratio = 0.73
navy       corr =  0.041   lum_ratio = 0.18
maroon     corr = -0.078   lum_ratio = 0.42
olive      corr = -0.093   lum_ratio = 0.52
red        corr =  0.026   lum_ratio = 0.37
sky-blue   corr = -0.046   lum_ratio = 0.69
```

Correlation ≈ 0 for every colour. A genuine photo of the *same* garment in
different colours retains its folds and shading, giving correlation ~0.8–0.95.
The same silhouette merely recoloured would give ~1.0. Values near zero mean
**each colour is an independently generated image with unrelated internal
structure** — no shared silhouette, no shared shading. That is why geometry drifts
between colours and why the same design lands differently on each variant.

---

## 3. Coverage: 94 of 188 canonical surfaces have no master at all

`canonical-mockup-spec.ts` defines the target matrix. Exact arithmetic:

| family | colours | views | needed | masters in kit | canonical | **missing** |
|---|---:|---:|---:|---:|---:|---:|
| tshirt | 8 | 5 | 40 | 16 | 16 | **24** |
| longsleeve | 10 | 5 | 50 | 20 | 20 | **30** |
| hoodie | 10 | 5 | 50 | 20 | 20 | **30** |
| mug | 10 | 3 | 30 | 20 | 20 | **10** |
| cap | 8 | 2 | 16 | 16 | 16 | **0** |
| waterbottle | 1 | 2 | 2 | 16 | 2 | **0** |
| **TOTAL** | | | **188** | **108** | **94** | **94** |

* Kit has 108 files but only **94 map to canonical surfaces**.
* **94 surfaces (exactly half) have no master.**
* Missing views: `left-sleeve`, `right-sleeve`, `neck-label` for all three apparel
  families (84 surfaces), plus `wrap` for all 10 mug colours (10 surfaces).

### Water Bottle: the kit violates the product contract

The kit ships **16** water-bottle masters (8 colours × 2 views). The canonical
spec declares exactly **one** bottle colour and says so explicitly:

> "The supplied bottle is a white sublimation-coated aluminium blank. These are
> not literal body-color variants; additional bottle colors require distinct
> physical blank masters and **must not be simulated by tinting this substrate**."

The 14 non-white bottle masters are therefore **non-canonical and must not be
shipped**. They represent a product that is not sold.

---

## 4. Why the previous chat's work would not have shipped

The abandoned session (`arena/01a044ff-trynext-lifestyle`, +821 lines) populated a
`smart-v9` folder by **copying smart-v4 PNGs**. That approach cannot pass the gate
in `scripts/prepare-smart-v9-release.mjs`, which requires a `candidate-manifest.json`
where every one of 188 entries carries:

* `visualReviewStatus: "accepted"`
* `provenance` ∈ `authentic-preserved` | `generated-master` | `derived-color-from-generated-master`
* a SHA-256 matching the actual 1024×1024 8-bit RGBA PNG on disk

Copying files produces **files**, not a **release**. The gate would have rejected
it. Its loss is therefore cheaper than it appears — but the genuine audit work
below was never written down, which is why it had to be re-derived.

**Water bottle is additionally hash-pinned** in `smart-v9-release.ts`: front must
be `19591c09…` and back `f3214733…`. Those two files may not be regenerated.

---

## 5. What is genuinely sound

* All 108 masters are valid, readable, and uniform: 1024×1024, 8-bit RGB, 4 ch.
* Layer naming is disciplined and consistent — no `Layer 0` / `Layer 1` junk.
* `canonical-mockup-spec.ts` is a well-formed, product-aware contract. It already
  models the bottle correctly (1 colour, non-tintable) and mug wrap geometry.
* `prepare-smart-v9-release.mjs` is a real gate: 188 surfaces, PNG signature,
  SHA-256, provenance, path-traversal and legacy-path rejection.
* Cap (16/16) and water bottle (2/2 canonical) already have full master coverage.

---

## 6. Hard constraints for any rebuild

1. **Do not fake smart objects.** Either build real Photoshop smart-object masters
   (requires Photoshop or a library that can write SO layers — psd-tools can
   *read* them but not author them), or **stop calling the system PSD-based** and
   ship a documented image + geometry pipeline instead.
2. **Do not tint the water bottle.** Hash-pinned front/back, single colour.
3. **Do not copy smart-v4 into smart-v9.** Provenance must be real.
4. **No cross-family asset reuse** (`acceptance.noCrossFamilyAssetReuse`).
5. **All views of one colour must share one silhouette and one colour identity**
   (`acceptance.sameColorIdentityAcrossViews`). Current colour variants fail this.
6. **No view fallback** (`acceptance.noViewFallback`) — 94 missing surfaces block
   release; partial shipping is not permitted.

---

## 7. Re-run this audit

```bash
python3 -m pip install --break-system-packages psd-tools Pillow numpy
python3 tools/audit_psd_masters.py --json /tmp/psd-audit.json
```

Composite renders of six representative masters are committed at
`audit/psd-composites/`.
