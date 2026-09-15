# Trynext studio mockup source contract

## Authority

The final runtime authority is the existing reviewed product photography in
`artifacts/trynex-storefront/public/mockups/`:

- Mug: `white-mug-front.png`, `white-mug-back.png`, and their reviewed cutouts.
- Cap: `white-cap-front.png` and its reviewed cutout; use the reviewed normalized
  rear asset when a back view is needed.
- Water bottle: `white-waterbottle-front.png` and its reviewed cutout; use the
  matching reviewed normalized rear asset for a rear view.

The source-kit and normalized folders are calibration/source material. They are
not permission to replace the reviewed runtime photos with a generated asset.

## Print-zone rules

Print zones are authored in the studio's 1000×1000 coordinate space and must be
calibrated against the exact photo/cutout pair used by the resolver:

1. Start from the visible alpha silhouette, not the square image bounds.
2. Exclude handles, brims, lids, caps, carabiners, and background/shadow pixels.
3. Keep front and back mug zones mirrored to the actual handle orientation.
4. A full-wrap zone may be wider than a single-face zone, but it still maps only
   to the printable mug body.
5. If a photo changes, recalibrate its zone and visually inspect front, back, and
   3D preview together before shipping.

## Review checklist

- The product edge is visible against the white canvas.
- Artwork can reach the calibrated body edge without a false overflow warning.
- Artwork never crosses a handle, brim, lid, or other non-printable silhouette.
- The same asset and zone are used in the editor, cart thumbnail, order preview,
  and 3D viewer.