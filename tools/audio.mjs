/**
 * Cắt + nén nhạc nền bằng công cụ có sẵn của macOS (afconvert).
 * Không cần ffmpeg: afconvert giải mã MP3 -> WAV, ta cắt/fade trên PCM, rồi mã hoá lại AAC.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SR = 44100;
const CH = 2;
const BYTES_PER_FRAME = 2 * CH; // PCM 16-bit stereo

function findDataChunk(buf) {
  let p = 12;
  while (p < buf.length - 8) {
    const id = buf.toString("latin1", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "data") return { offset: p + 8, length: size };
    p += 8 + size + (size & 1);
  }
  throw new Error("WAV không có chunk 'data'");
}

function wavHeader(dataLength) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + dataLength, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);              // PCM
  h.writeUInt16LE(CH, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * BYTES_PER_FRAME, 28);
  h.writeUInt16LE(BYTES_PER_FRAME, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(dataLength, 40);
  return h;
}

/** Cắt [0, endSec) và fade-out fadeSec cuối, trả về Buffer WAV. */
function trimAndFade(wav, endSec, fadeSec) {
  const { offset, length } = findDataChunk(wav);
  const available = Math.floor(length / BYTES_PER_FRAME);
  const frames = Math.min(available, Math.floor(endSec * SR));
  const fadeFrames = Math.min(frames, Math.floor(fadeSec * SR));
  const out = Buffer.alloc(frames * BYTES_PER_FRAME);

  wav.copy(out, 0, offset, offset + frames * BYTES_PER_FRAME);

  const fadeStart = frames - fadeFrames;
  for (let i = fadeStart; i < frames; i++) {
    const gain = (frames - i) / fadeFrames;
    const base = i * BYTES_PER_FRAME;
    for (let c = 0; c < CH; c++) {
      const at = base + c * 2;
      out.writeInt16LE(Math.round(out.readInt16LE(at) * gain), at);
    }
  }
  return Buffer.concat([wavHeader(out.length), out]);
}

/**
 * @param {Buffer} mp3      dữ liệu MP3 gốc
 * @param {object} opts     { endSec, fadeSec, variants: [{name, codec, bitrate}] }
 * @returns {Map<string, Buffer>} tên biến thể -> dữ liệu .m4a
 */
export function encodeVariants(mp3, { endSec, fadeSec, variants }) {
  const dir = mkdtempSync(join(tmpdir(), "bgm-"));
  try {
    const srcPath = join(dir, "src.mp3");
    const fullWav = join(dir, "full.wav");
    const cutWav = join(dir, "cut.wav");
    writeFileSync(srcPath, mp3);

    execFileSync("afconvert", [srcPath, "-f", "WAVE", "-d", `LEI16@${SR}`, "-c", String(CH), fullWav]);
    writeFileSync(cutWav, trimAndFade(readFileSync(fullWav), endSec, fadeSec));

    const result = new Map();
    for (const v of variants) {
      const out = join(dir, `${v.name}.m4a`);
      execFileSync("afconvert", [cutWav, "-f", "m4af", "-d", v.codec, "-b", String(v.bitrate), "-q", "127", "-s", "2", out]);
      result.set(v.name, readFileSync(out));
    }
    return result;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
