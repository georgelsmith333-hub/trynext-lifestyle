import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import imageSize from "./index.js";

const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000002000000030806000000", "hex");
const gif = Buffer.from("47494638396104000500", "hex");
const bmp = Buffer.alloc(26);
bmp.write("BM", 0, "ascii");
bmp.writeInt32LE(7, 18);
bmp.writeInt32LE(9, 22);

assert.deepEqual(imageSize(png), { width: 2, height: 3, type: "png" });
assert.deepEqual(imageSize(gif), { width: 4, height: 5, type: "gif" });
assert.deepEqual(imageSize(bmp), { width: 7, height: 9, type: "bmp" });

const malformedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x00]);
assert.throws(() => imageSize(malformedJpeg), /unsupported|invalid/);

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 13"/>');
assert.deepEqual(imageSize(svg), { width: 11, height: 13, type: "svg" });

const psd = Buffer.alloc(26);
Buffer.from("8BPS").copy(psd, 0);
psd.writeUInt16BE(1, 4);
psd.writeUInt32BE(13, 14);
psd.writeUInt32BE(17, 18);
assert.deepEqual(imageSize(psd), { width: 17, height: 13, type: "psd" });

const pathInput = join(tmpdir(), `image-size-safe-${process.pid}.png`);
writeFileSync(pathInput, png);
assert.deepEqual(imageSize(pathInput), { width: 2, height: 3, type: "png" });

console.log("image-size-safe tests passed");