import { zipSync } from "fflate";

// files should have `webkitRelativePath`
export async function zipFiles(files: File[]): Promise<Uint8Array> {
  const filesToAdd: { [path: string]: Uint8Array } = {};

  for (const f of files) {
    filesToAdd[f.webkitRelativePath] = new Uint8Array(await f.arrayBuffer()); 
  }
  
  return zipSync(filesToAdd);
}
