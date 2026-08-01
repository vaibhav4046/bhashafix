/**
 * Minimal, dependency-free ZIP central-directory reader.
 *
 * Office Open XML packages (.pptx, .docx, .xlsx) are ordinary ZIP archives, so
 * their part names can be enumerated by parsing the central directory directly.
 * Shelling out to `tar` is not portable: GNU tar interprets a Windows absolute
 * path such as `C:\repo\deck.pptx` as a remote `host:path` specification and
 * fails with "Cannot connect to C: resolve failed".
 */

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const END_OF_CENTRAL_DIRECTORY_LENGTH = 22;
const CENTRAL_FILE_HEADER_LENGTH = 46;
const MAXIMUM_ARCHIVE_COMMENT_LENGTH = 0xffff;
const UTF8_FILENAME_FLAG = 0x800;
const ZIP64_COUNT_SENTINEL = 0xffff;
const ZIP64_SIZE_SENTINEL = 0xffffffff;

export type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
};

function locateEndOfCentralDirectory(archive: Buffer): number {
  const earliest = Math.max(
    0,
    archive.length -
      END_OF_CENTRAL_DIRECTORY_LENGTH -
      MAXIMUM_ARCHIVE_COMMENT_LENGTH,
  );
  for (
    let offset = archive.length - END_OF_CENTRAL_DIRECTORY_LENGTH;
    offset >= earliest;
    offset -= 1
  ) {
    if (archive.readUInt32LE(offset) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      continue;
    }
    const commentLength = archive.readUInt16LE(offset + 20);
    if (
      offset + END_OF_CENTRAL_DIRECTORY_LENGTH + commentLength ===
      archive.length
    ) {
      return offset;
    }
  }
  throw new Error("ZIP end-of-central-directory record was not found.");
}

/**
 * Reads every central-directory record and returns the archive's entries in
 * stored order. Throws with a specific message when the buffer is not a ZIP
 * container or when the directory is internally inconsistent.
 */
export function readZipEntries(archive: Buffer): ZipEntry[] {
  if (archive.length < END_OF_CENTRAL_DIRECTORY_LENGTH) {
    throw new Error(
      `Archive is ${archive.length} bytes; too small to be a ZIP container.`,
    );
  }
  if (archive.readUInt32LE(0) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error("Archive does not start with a ZIP local file header.");
  }

  const end = locateEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(end + 10);
  const directorySize = archive.readUInt32LE(end + 12);
  const directoryOffset = archive.readUInt32LE(end + 16);
  if (
    entryCount === ZIP64_COUNT_SENTINEL ||
    directorySize === ZIP64_SIZE_SENTINEL ||
    directoryOffset === ZIP64_SIZE_SENTINEL
  ) {
    throw new Error(
      "Archive uses the ZIP64 format, which this reader does not parse.",
    );
  }
  if (directoryOffset + directorySize > archive.length) {
    throw new Error(
      "ZIP central directory extends past the end of the archive.",
    );
  }

  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + CENTRAL_FILE_HEADER_LENGTH > archive.length) {
      throw new Error(
        `ZIP central directory entry ${index} extends past the end of the archive.`,
      );
    }
    if (archive.readUInt32LE(cursor) !== CENTRAL_FILE_HEADER_SIGNATURE) {
      throw new Error(
        `ZIP central directory entry ${index} has an invalid signature.`,
      );
    }
    const flags = archive.readUInt16LE(cursor + 8);
    const compressionMethod = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const nameStart = cursor + CENTRAL_FILE_HEADER_LENGTH;
    entries.push({
      name: archive
        .subarray(nameStart, nameStart + nameLength)
        .toString((flags & UTF8_FILENAME_FLAG) === 0 ? "latin1" : "utf8"),
      compressionMethod,
      compressedSize,
      uncompressedSize,
    });
    cursor = nameStart + nameLength + extraLength + commentLength;
  }
  if (cursor !== directoryOffset + directorySize) {
    throw new Error(
      `ZIP central directory consumed ${cursor - directoryOffset} bytes but declared ${directorySize}.`,
    );
  }
  return entries;
}
