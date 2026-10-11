import { Inflate, Z_SYNC_FLUSH } from "pako";

// data channel messages of the tablet's screen share
export const MSG = {
  FRAMEBUFFER: 0,
  CURSOR: 100,
  SHUTDOWN: 101,
  ROTATION: 102,
  PING: 103,
  HANDSHAKE: 104,
} as const;

export type Rect = { x: number; y: number; imageData: ImageData };

export type Message =
  | { type: typeof MSG.HANDSHAKE; width: number; height: number }
  | { type: typeof MSG.FRAMEBUFFER; rects: Rect[] }
  | { type: typeof MSG.CURSOR; x: number; y: number }
  | { type: typeof MSG.ROTATION; degrees: number }
  | { type: typeof MSG.SHUTDOWN | typeof MSG.PING };

// Frame wire format: [type(1), rectCount(2 BE), deflatedSize(4 BE), zlib...]
const HEADER_SIZE = 7;
// Rect wire format (after inflate): [x(2), y(2), w(2), h(2), pixelDataLen(4), pixels...]
const RECT_HEADER_SIZE = 12;

// Reassembles framebuffer frames split across multiple data-channel messages;
// other message types pass through untouched.
export class FrameAssembler {
  private buffer: Uint8Array<ArrayBuffer> | null = null;
  private expectedSize = 0;
  private receivedSize = 0;

  reset() {
    this.buffer = null;
    this.expectedSize = 0;
    this.receivedSize = 0;
  }

  // Returns a complete message, or null while a frame is still arriving.
  process(data: ArrayBuffer): ArrayBuffer | null {
    if (this.buffer) return this.appendChunk(this.buffer, data);
    if (data.byteLength < HEADER_SIZE) return data;
    const view = new DataView(data);
    if (view.getUint8(0) !== MSG.FRAMEBUFFER) return data;
    const total = HEADER_SIZE + view.getUint32(3, false);
    if (data.byteLength >= total) return data;
    this.expectedSize = total;
    this.buffer = new Uint8Array(total);
    this.buffer.set(new Uint8Array(data), 0);
    this.receivedSize = data.byteLength;
    return null;
  }

  private appendChunk(buffer: Uint8Array<ArrayBuffer>, data: ArrayBuffer) {
    const chunk = new Uint8Array(data);
    const take = Math.min(chunk.byteLength, this.expectedSize - this.receivedSize);
    buffer.set(chunk.subarray(0, take), this.receivedSize);
    this.receivedSize += take;
    if (this.receivedSize < this.expectedSize) return null;
    this.reset();
    return buffer.buffer;
  }
}

// The tablet sends each frame as a zlib stream without a final block. pako >= 2
// rejects that in inflate() ("buffer error"), a flushed push returns the data.
function inflateFrame(compressed: Uint8Array) {
  const inf = new Inflate();
  const chunks: Uint8Array[] = [];
  inf.onData = (chunk) => chunks.push(chunk as Uint8Array);
  inf.push(compressed, Z_SYNC_FLUSH);
  if (inf.err) throw new Error(inf.msg);
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

function decodeFramebuffer(data: ArrayBuffer, view: DataView): Message {
  const rectCount = view.getUint16(1, false);
  const deflatedSize = view.getUint32(3, false);
  if (HEADER_SIZE + deflatedSize > data.byteLength) {
    throw new Error("deflated size exceeds message buffer");
  }
  const raw = inflateFrame(new Uint8Array(data.slice(HEADER_SIZE, HEADER_SIZE + deflatedSize)));
  if (!raw.length) throw new Error("inflate produced no output (truncated stream)");

  const rv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const rects: Rect[] = [];
  let pos = 0;
  for (let i = 0; i < rectCount; i++) {
    if (pos + RECT_HEADER_SIZE > raw.byteLength) break;
    const x = rv.getUint16(pos, false);
    const y = rv.getUint16(pos + 2, false);
    const w = rv.getUint16(pos + 4, false);
    const h = rv.getUint16(pos + 6, false);
    const pxDataLen = rv.getUint32(pos + 8, false);
    if (pos + RECT_HEADER_SIZE + pxDataLen > raw.byteLength) break;

    // RGB565 little endian to RGBA
    const pxView = new DataView(raw.buffer, raw.byteOffset + pos + RECT_HEADER_SIZE, pxDataLen);
    const imageData = new ImageData(w, h);
    const out = imageData.data;
    for (let p = 0; p < w * h; p++) {
      const val = pxView.getUint16(p * 2, true);
      const r5 = (val >> 11) & 0x1f;
      const g6 = (val >> 5) & 0x3f;
      const b5 = val & 0x1f;
      out[p * 4] = (r5 << 3) | (r5 >> 2);
      out[p * 4 + 1] = (g6 << 2) | (g6 >> 4);
      out[p * 4 + 2] = (b5 << 3) | (b5 >> 2);
      out[p * 4 + 3] = 255;
    }
    pos += RECT_HEADER_SIZE + pxDataLen;
    rects.push({ x, y, imageData });
  }
  return { type: MSG.FRAMEBUFFER, rects };
}

export function parseMessage(data: ArrayBuffer): Message {
  if (data.byteLength < 1) throw new Error("empty message");
  const view = new DataView(data);
  const type = view.getUint8(0);
  switch (type) {
    case MSG.HANDSHAKE:
      if (data.byteLength < HEADER_SIZE) throw new Error("short handshake");
      return { type, width: view.getUint16(3, false), height: view.getUint16(5, false) };
    case MSG.FRAMEBUFFER:
      return decodeFramebuffer(data, view);
    case MSG.CURSOR:
      return { type, x: view.getUint16(1, false), y: view.getUint16(3, false) };
    case MSG.ROTATION:
      return { type, degrees: (360 - view.getUint32(1, false)) % 360 };
    case MSG.SHUTDOWN:
    case MSG.PING:
      return { type };
    default:
      throw new Error(`unknown message type: ${type}`);
  }
}

// the first message on the data channel
export function hello() {
  const header = new TextEncoder().encode("reMarkable");
  const buf = new ArrayBuffer(header.length + 2);
  new Uint8Array(buf).set(header);
  return buf;
}

// asks the tablet to end the session
export function shutdown() {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setInt32(0, 0x65, false);
  return buf;
}
