type ReadAt = (offset: number, length: number) => Promise<Uint8Array>;

const mp4Brands = new Set(['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ']);
const fourCC = (bytes: Uint8Array, offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
const uint32 = (bytes: Uint8Array, offset: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);

// Inspect top-level ISO BMFF boxes, skipping media payloads. This classifies the
// container, not its codecs or whether every sample is playable.
export async function inspectVideoContainer(size: number, readAt: ReadAt) {
  let offset = 0;
  let brands: string[] = [];
  let hasMovie = false;
  let hasMedia = false;
  let hasMovieFragments = false;

  for (let boxes = 0; offset < size && boxes < 2048; boxes++) {
    const header = await readAt(offset, Math.min(16, size - offset));
    if (header.length < 8) break;
    const type = fourCC(header, 4);
    let boxSize = uint32(header, 0);
    let headerSize = 8;
    if (boxSize === 1) {
      if (header.length < 16) break;
      boxSize = uint32(header, 8) * 2 ** 32 + uint32(header, 12);
      headerSize = 16;
    } else if (boxSize === 0) {
      boxSize = size - offset;
    }
    if (!Number.isSafeInteger(boxSize) || boxSize < headerSize || boxSize > size - offset) break;

    const payloadSize = boxSize - headerSize;
    if (type === 'ftyp' && payloadSize >= 8 && payloadSize <= 4096 && payloadSize % 4 === 0) {
      const payload = await readAt(offset + headerSize, payloadSize);
      if (payload.length !== payloadSize) break;
      brands = [fourCC(payload, 0)];
      for (let index = 8; index < payloadSize; index += 4) brands.push(fourCC(payload, index));
    }
    if (type === 'moov' && payloadSize > 0) hasMovie = true;
    if (type === 'mdat' && payloadSize > 0) hasMedia = true;
    if (type === 'moof' && payloadSize > 0) hasMovieFragments = true;
    offset += boxSize;
  }

  if (offset !== size || !hasMovie || !hasMedia) throw Error('Tệp quay bị thiếu dữ liệu hoặc có cấu trúc không hợp lệ.');
  if (brands.includes('qt  ')) return {extension: 'mov' as const, hasMovieFragments};
  if (mp4Brands.has(brands[0])) return {extension: 'mp4' as const, hasMovieFragments};
  throw Error('Không nhận dạng được container MP4 hoặc QuickTime của tệp quay.');
}

export function recordingStem(recordedAt: Date, cameraName: string, uid: string) {
  const camera = cameraName.normalize('NFKD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'Camera';
  const timestamp = recordedAt.toISOString().replace(/[:.]/g, '-');
  return `${timestamp}__${camera}__local-test__${uid}`;
}
