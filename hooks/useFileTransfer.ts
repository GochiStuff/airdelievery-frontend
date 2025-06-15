import { useRef, useState, ChangeEvent } from "react";

type Transfer = { file: File; progress: number; transferId: string };

export function useFileTransfer(
  dataChannel: RTCDataChannel | null,
  addLog: (msg: string) => void
) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const filesToSend = useRef<FileList | null>(null);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    filesToSend.current = e.target.files;
  }

  function sendFiles() {
    if (!dataChannel || dataChannel.readyState !== "open") {
      addLog("DataChannel not open.");
      return;
    }
    if (!filesToSend.current) {
      addLog("No files selected.");
      return;
    }
    Array.from(filesToSend.current).forEach(sendFile);
  }

  function sendFile(file: File) {
    const CHUNK_SIZE = 16 * 1024;
    let offset = 0;
    const transferId = Math.random().toString(36).slice(2);
    addLog(`Transferring: ${file.name}`);
    setTransfers(prev => [...prev, { file, progress: 0, transferId }]);
    dataChannel!.send(JSON.stringify({ transferId, fileName: file.name, fileSize: file.size }));

    const reader = new FileReader();
    reader.onload = e => {
      const buffer = e.target!.result as ArrayBuffer;
      let sent = 0;
      while (offset < buffer.byteLength) {
        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        dataChannel!.send(chunk);
        offset += CHUNK_SIZE;
        sent += chunk.byteLength;
        setTransfers(prev => prev.map(t =>
          t.transferId === transferId
            ? { ...t, progress: Math.round((sent / file.size) * 100) }
            : t
        ));
      }
      addLog(`Done: ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
  }

  return { transfers, handleFileSelect, sendFiles };
}
