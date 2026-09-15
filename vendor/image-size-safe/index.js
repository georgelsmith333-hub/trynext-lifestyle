"use strict";

const fs = require("node:fs");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PSD_SIGNATURE = Buffer.from("8BPS", "ascii");
const KTX1_SIGNATURE = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
const KTX2_SIGNATURE = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_INPUT_BYTES = 64 * 1024 * 1024;

function ensureBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === "string") {
    const stat = fs.statSync(input);
    if (!stat.isFile() || stat.size > MAX_INPUT_BYTES) {
      throw new TypeError("image-size-safe rejects non-files and images over 64 MiB");
    }
    return fs.readFileSync(input);
  }
  throw new TypeError("image-size-safe expects an image Buffer or file path");
}

function dimensionsFromPng(data) {
  if (data.length < 24 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height, type: "png" } : null;
}

function dimensionsFromGif(data) {
  if (data.length < 10 || data.toString("ascii", 0, 4) !== "GIF8") return null;
  const width = data.readUInt16LE(6);
  const height = data.readUInt16LE(8);
  return width > 0 && height > 0 ? { width, height, type: "gif" } : null;
}

function dimensionsFromBmp(data) {
  if (data.length < 26 || data.toString("ascii", 0, 2) !== "BM") return null;
  const width = data.readInt32LE(18);
  const height = Math.abs(data.readInt32LE(22));
  if (width <= 0 || height <= 0) return null;
  return { width, height, type: "bmp" };
}

function dimensionsFromJpeg(data) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  let scanned = 0;
  while (offset + 3 < data.length && scanned++ < 4096) {
    while (offset < data.length && data[offset] === 0xff) offset++;
    if (offset >= data.length) break;
    const marker = data[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > data.length) break;
    const segmentLength = data.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > data.length) break;
    const isFrame = (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf);
    if (isFrame && segmentLength >= 7) {
      const height = data.readUInt16BE(offset + 3);
      const width = data.readUInt16BE(offset + 5);
      if (width > 0 && height > 0) return { width, height, type: "jpg" };
    }
    offset += segmentLength;
  }
  return null;
}

function dimensionsFromWebp(data) {
  if (data.length < 30 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = data.toString("ascii", 12, 16);
  if (chunk === "VP8X" && data.length >= 30) {
    const width = 1 + data[24] + (data[25] << 8) + (data[26] << 16);
    const height = 1 + data[27] + (data[28] << 8) + (data[29] << 16);
    return width > 0 && height > 0 ? { width, height, type: "webp" } : null;
  }
  if (chunk === "VP8L" && data.length >= 25 && data[20] === 0x2f) {
    const bits = data.readUInt32LE(21);
    const width = 1 + (bits & 0x3fff);
    const height = 1 + ((bits >>> 14) & 0x3fff);
    return { width, height, type: "webp" };
  }
  if (chunk === "VP8 " && data.length >= 30) {
    const start = data.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    if (start >= 0 && start + 7 < data.length) {
      return { width: data.readUInt16LE(start + 3) & 0x3fff, height: data.readUInt16LE(start + 5) & 0x3fff, type: "webp" };
    }
  }
  return null;
}

function dimensionsFromPsd(data) {
  if (data.length < 26 || !data.subarray(0, 4).equals(PSD_SIGNATURE)) return null;
  const version = data.readUInt16BE(4);
  if (version !== 1 && version !== 2) return null;
  const height = data.readUInt32BE(14);
  const width = data.readUInt32BE(18);
  return width > 0 && height > 0 ? { width, height, type: "psd" } : null;
}

function dimensionsFromSvg(data) {
  const text = data.toString("utf8", 0, Math.min(data.length, 1024 * 1024));
  if (!/<svg(?:\s|>)/i.test(text)) return null;
  const number = (value) => {
    const match = String(value ?? "").match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : null;
  };
  const root = text.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  let width = number(root.match(/\bwidth\s*=\s*["']([^"']+)["']/i)?.[1]);
  let height = number(root.match(/\bheight\s*=\s*["']([^"']+)["']/i)?.[1]);
  if (!width || !height) {
    const viewBox = root.match(/\bviewBox\s*=\s*["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)/i);
    width = width || number(viewBox?.[1]);
    height = height || number(viewBox?.[2]);
  }
  return width > 0 && height > 0 ? { width, height, type: "svg" } : null;
}

function dimensionsFromTiff(data) {
  if (data.length < 8) return null;
  const littleEndian = data[0] === 0x49 && data[1] === 0x49;
  const bigEndian = data[0] === 0x4d && data[1] === 0x4d;
  if (!littleEndian && !bigEndian) return null;
  const read16 = littleEndian ? data.readUInt16LE.bind(data) : data.readUInt16BE.bind(data);
  const read32 = littleEndian ? data.readUInt32LE.bind(data) : data.readUInt32BE.bind(data);
  if (read16(2) !== 42) return null;
  const ifd = read32(4);
  if (ifd + 2 > data.length) return null;
  const entries = Math.min(read16(ifd), 256);
  let width = null;
  let height = null;
  for (let i = 0; i < entries; i++) {
    const offset = ifd + 2 + i * 12;
    if (offset + 12 > data.length) break;
    const tag = read16(offset);
    const type = read16(offset + 2);
    const count = read32(offset + 4);
    if (count < 1) continue;
    const valueBytes = type === 3 ? 2 : type === 4 ? 4 : 0;
    if (!valueBytes) continue;
    const valueOffset = count * valueBytes <= 4 ? offset + 8 : read32(offset + 8);
    if (valueOffset + valueBytes > data.length) continue;
    const value = type === 3 ? read16(valueOffset) : read32(valueOffset);
    if (tag === 256) width = value;
    if (tag === 257) height = value;
  }
  return width > 0 && height > 0 ? { width, height, type: "tiff" } : null;
}

function dimensionsFromKtx(data) {
  const isKtx1 = data.length >= 44 && data.subarray(0, 12).equals(KTX1_SIGNATURE);
  const isKtx2 = data.length >= 28 && data.subarray(0, 12).equals(KTX2_SIGNATURE);
  if (!isKtx1 && !isKtx2) return null;
  if (isKtx2) {
    const width = data.readUInt32LE(20);
    const height = data.readUInt32LE(24);
    return width > 0 && height > 0 ? { width, height, type: "ktx2" } : null;
  }
  const littleEndian = data.readUInt32LE(12) === 0x04030201;
  const bigEndian = data.readUInt32BE(12) === 0x04030201;
  if (!littleEndian && !bigEndian) return null;
  const read32 = littleEndian ? data.readUInt32LE.bind(data) : data.readUInt32BE.bind(data);
  const width = read32(36);
  const height = read32(40);
  return width > 0 && height > 0 ? { width, height, type: "ktx" } : null;
}

function imageSize(input) {
  const data = ensureBuffer(input);
  const dimensions = dimensionsFromPng(data)
    || dimensionsFromGif(data)
    || dimensionsFromJpeg(data)
    || dimensionsFromWebp(data)
    || dimensionsFromBmp(data)
    || dimensionsFromPsd(data)
    || dimensionsFromSvg(data)
    || dimensionsFromTiff(data)
    || dimensionsFromKtx(data);
  if (!dimensions) throw new TypeError("unsupported or invalid image");
  return dimensions;
}

module.exports = imageSize;
module.exports.imageSize = imageSize;
module.exports.default = imageSize;