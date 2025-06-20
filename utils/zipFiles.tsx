import {
  zipSync,
  unzipSync,
  strFromU8,
  ZipInputFile
} from "fflate";

import type { Zippable } from "fflate";

// 🔄 ZIP FOLDER: Accepts files with folder structure (from webkitdirectory input)
export async function zipFolder(files: File[]): Promise<Uint8Array> {
  const input: Zippable = {};

  for (const file of files) {
    const path = file.webkitRelativePath || file.name; // preserves folder structure
    const buffer = new Uint8Array(await file.arrayBuffer());
    input[path] = buffer;
  }

  const zipped = zipSync(input, { level: 6 });
  return zipped;
}
export async function unzipBlobToFiles(blob: Blob): Promise<{ name: string; blob: Blob }[]> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const unzipped = unzipSync(buffer);

  return Object.entries(unzipped).map(([name, content]) => ({
    name,
    blob: new Blob([new Uint8Array(content as Uint8Array)])
  }));
}
