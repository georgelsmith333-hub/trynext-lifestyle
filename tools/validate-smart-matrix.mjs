/**
 * Validate the quarantined six-family Smart Mockup matrix without opening every
 * PSD. Binary Smart Object validation remains the responsibility of
 * audit_psd_masters.py; this script validates the manifest/source/runtime
 * contract and all checksums around those documents.
 *
 * Usage:
 *   node tools/validate-smart-matrix.mjs [staging-root]
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const ROOT = path.resolve(process.argv[2] ?? path.join(REPO, "dist-mockups", "staging", "smart-v10"));
const MANIFEST_PATH = path.join(ROOT, "manifest.json");

const EXPECTED = {
  tshirt: { colors: ["white", "black", "navy", "maroon", "olive", "sky-blue", "grey", "red"], views: ["front", "back", "left-sleeve", "right-sleeve", "neck-label"] },
  longsleeve: { colors: ["white", "black", "charcoal", "heather-grey", "navy", "royal-blue", "forest-green", "burgundy", "red", "sand"], views: ["front", "back", "left-sleeve", "right-sleeve", "neck-label"] },
  hoodie: { colors: ["white", "black", "charcoal", "heather-grey", "navy", "royal-blue", "forest-green", "burgundy", "red", "sand"], views: ["front", "back", "left-sleeve", "right-sleeve", "neck-label"] },
  mug: { colors: ["white", "black", "navy", "red", "green", "purple", "sky-blue", "pink", "maroon", "orange"], views: ["front", "back", "wrap"] },
  cap: { colors: ["white", "black", "navy", "maroon", "olive", "red", "grey", "forest"], views: ["front", "back"] },
  waterbottle: { colors: ["white"], views: ["front", "back"] },
};

function checksum(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function fail(errors, message) {
  errors.push(message);
}

if (!existsSync(MANIFEST_PATH)) {
  console.error(`missing staging manifest: ${MANIFEST_PATH}`);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const errors = [];
if (manifest.schema !== "trynext-smart-mockup-staging/v2") fail(errors, `unexpected schema ${manifest.schema}`);
if (manifest.canonicalSurfaceCount !== 188) fail(errors, `canonicalSurfaceCount=${manifest.canonicalSurfaceCount}`);
if (manifest.surfaceCount !== 188 || manifest.surfaces?.length !== 188) fail(errors, `surface count is ${manifest.surfaceCount}/${manifest.surfaces?.length}`);
if (JSON.stringify(manifest.waterbottleColors) !== JSON.stringify(["white"])) fail(errors, "water bottle color contract is not white-only");

const seen = new Set();
for (const record of manifest.surfaces ?? []) {
  const key = `${record.family}/${record.color}/${record.view}`;
  if (seen.has(key)) fail(errors, `duplicate surface ${key}`);
  seen.add(key);

  const expected = EXPECTED[record.family];
  if (!expected) {
    fail(errors, `unexpected family ${record.family}`);
    continue;
  }
  if (!expected.colors.includes(record.color)) fail(errors, `unexpected color ${key}`);
  if (!expected.views.includes(record.view)) fail(errors, `unexpected view ${key}`);
  if (!record.sourceChecksum || !/^[a-f0-9]{64}$/.test(record.sourceChecksum)) fail(errors, `missing source checksum ${key}`);
  if (!record.baseChecksum || !/^[a-f0-9]{64}$/.test(record.baseChecksum)) fail(errors, `missing base checksum ${key}`);
  if (!record.masterChecksum || !/^[a-f0-9]{64}$/.test(record.masterChecksum)) fail(errors, `missing master checksum ${key}`);
  if (!record.previewChecksum || !/^[a-f0-9]{64}$/.test(record.previewChecksum)) fail(errors, `missing preview checksum ${key}`);
  if (!record.provenance || record.provenance === "fallback") fail(errors, `invalid provenance ${key}`);
  if (record.masterFormat !== "psd" && record.masterFormat !== "psb") fail(errors, `invalid master format ${key}`);
  if (record.family === "waterbottle" && record.color !== "white") fail(errors, `non-white bottle record ${key}`);

  for (const field of ["derivedBasePath", "masterPath", "previewPath", "proofPreviewPath"]) {
    const file = path.join(REPO, record[field]);
    if (!existsSync(file)) {
      fail(errors, `missing ${field} for ${key}: ${record[field]}`);
    }
  }
  const paths = [
    ["baseChecksum", record.derivedBasePath],
    ["masterChecksum", record.masterPath],
    ["previewChecksum", record.previewPath],
    ["proofPreviewChecksum", record.proofPreviewPath],
  ];
  for (const [field, relative] of paths) {
    const file = path.join(REPO, relative);
    if (existsSync(file) && checksum(file) !== record[field]) fail(errors, `${field} mismatch ${key}`);
  }
}

for (const [family, expected] of Object.entries(EXPECTED)) {
  for (const color of expected.colors) {
    for (const view of expected.views) {
      const key = `${family}/${color}/${view}`;
      if (!seen.has(key)) fail(errors, `missing canonical surface ${key}`);
    }
  }
}

const bottleRecords = (manifest.surfaces ?? []).filter((record) => record.family === "waterbottle");
if (bottleRecords.some((record) => record.color !== "white")) fail(errors, "non-white water bottle present");

console.log(`Validated ${seen.size} manifest surfaces under ${ROOT}`);
console.log(`  expected canonical matrix: ${seen.size === 188 ? "188/188" : `${seen.size}/188`}`);
console.log(`  checksum records: ${errors.length ? "FAIL" : "all match"}`);
if (errors.length) {
  console.error(`  failures: ${errors.length}`);
  for (const error of errors.slice(0, 40)) console.error(`    ! ${error}`);
  process.exitCode = 1;
} else {
  console.log("  matrix contract: pass");
}