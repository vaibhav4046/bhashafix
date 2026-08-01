/**
 * Minimal, dependency-free ZIP central-directory reader for the browser.
 *
 * The report import console must open a screenshots archive without uploading
 * it, so the parsing happens here against the raw bytes the File API hands us.
 * Only the two storage methods the BhashaFix CLI can emit are supported:
 * stored (0) and deflate (8). Anything else is reported as unsupported rather
 * than guessed at, because a wrong guess would render a broken image and imply
 * the archive was read successfully.
 */

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_END_LOCATOR = 0x07064b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const MAX_COMMENT_LENGTH = 0xffff;

export type ZipEntry = {
  name: string;
  /** Compression method recorded in the central directory. */
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  /** CRC-32 the archive itself recorded for this entry. */
  crc32: string;
  localHeaderOffset: number;
};

export class ZipReadError extends Error {}

function readEndOfCentralDirectory(view: DataView) {
  const searchFloor = Math.max(0, view.byteLength - MAX_COMMENT_LENGTH - 22);
  for (let offset = view.byteLength - 22; offset >= searchFloor; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      return offset;
    }
  }
  throw new ZipReadError(
    "No ZIP end-of-central-directory record was found. The file is not a ZIP archive, or it is truncated.",
  );
}

/**
 * Lists the archive members. Names are used verbatim from the central
 * directory; nothing is resolved against the filesystem, and a member is never
 * treated as a path.
 */
export function readZipDirectory(bytes: ArrayBuffer): ZipEntry[] {
  const view = new DataView(bytes);
  if (view.byteLength < 22) {
    throw new ZipReadError("The file is too small to be a ZIP archive.");
  }
  const eocd = readEndOfCentralDirectory(view);
  if (
    eocd >= 20 &&
    view.getUint32(eocd - 20, true) === ZIP64_END_LOCATOR
  ) {
    throw new ZipReadError(
      "This is a ZIP64 archive. The console reads standard ZIP archives only, so it will not claim to have read this one.",
    );
  }
  const entryCount = view.getUint16(eocd + 10, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > view.byteLength) {
      throw new ZipReadError(
        `The central directory ends after ${index} of ${entryCount} declared entries.`,
      );
    }
    if (view.getUint32(cursor, true) !== CENTRAL_FILE_HEADER) {
      throw new ZipReadError(
        `Central directory entry ${index + 1} has no valid file header signature.`,
      );
    }
    const method = view.getUint16(cursor + 10, true);
    const crc32 = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(
      new Uint8Array(bytes, cursor + 46, nameLength),
    );
    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      crc32: crc32.toString(16).padStart(8, "0"),
      localHeaderOffset,
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Reads one member's bytes, decompressing only if the method is deflate. */
export async function readZipEntry(
  bytes: ArrayBuffer,
  entry: ZipEntry,
): Promise<Uint8Array> {
  const view = new DataView(bytes);
  if (view.getUint32(entry.localHeaderOffset, true) !== LOCAL_FILE_HEADER) {
    throw new ZipReadError(
      `"${entry.name}" does not start with a local file header at the offset the directory records.`,
    );
  }
  const nameLength = view.getUint16(entry.localHeaderOffset + 26, true);
  const extraLength = view.getUint16(entry.localHeaderOffset + 28, true);
  const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const raw = new Uint8Array(bytes, dataStart, entry.compressedSize);
  if (entry.method === 0) return raw;
  if (entry.method !== 8) {
    throw new ZipReadError(
      `"${entry.name}" uses compression method ${entry.method}. Only stored (0) and deflate (8) are read here.`,
    );
  }
  if (typeof DecompressionStream === "undefined") {
    throw new ZipReadError(
      "This browser has no DecompressionStream, so deflated members cannot be read here.",
    );
  }
  const stream = new Blob([raw as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * SHA-256 over bytes, as an artifact hash the reviewer can compare against a
 * recorded one. Returns null where Web Crypto is unavailable (an insecure
 * context) rather than returning a placeholder that looks like a hash.
 */
export async function sha256Hex(
  bytes: ArrayBuffer | Uint8Array,
): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const source =
    bytes instanceof Uint8Array
      ? bytes.slice().buffer
      : (bytes as ArrayBuffer);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} kB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}
