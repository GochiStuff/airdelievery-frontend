"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import PQueue from "p-queue";
import pRetry from "p-retry";
import streamSaver from "streamsaver";
import { flattenFileList } from "@/utils/flattenFilelist";

type Transfer = {
  file: File;
  transferId: string;
  directoryPath: string;
  progress: number;
  speedBps: number;
  status: "queued" | "sending" | "done" | "error";
};

type Meta = {
  totalSent: number;
  totalReceived: number;
  speedBps: number;
};

export function useFileTransfer(
  dataChannel: RTCDataChannel | null,
  addLog: (msg: string) => void
) {
  const [queue, setQueue] = useState<Transfer[]>([]);
  const [meta, setMeta] = useState<Meta>({
    totalSent: 0,
    totalReceived: 0,
    speedBps: 0,
  });

  const incoming = useRef<
    Record<
      string,
      { size: number; received: number; directoryPath: string; writer: WritableStreamDefaultWriter }
    >
  >({});
  const pq = useRef(new PQueue({ concurrency: 1 }));

  // Enqueue files/folders
  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = await flattenFileList(e.target.files);
    setQueue(prev => {
      const existing = new Set(prev.map(t => t.directoryPath));
      const newTransfers = files
        .filter(f => !existing.has((f as any).webkitRelativePath || f.name))
        .map(file => ({
          file,
          transferId: crypto.randomUUID(),
          directoryPath: (file as any).webkitRelativePath || file.name,
          progress: 0,
          speedBps: 0,
          status: 'queued' as const,
        }));
      return [...prev, ...newTransfers];
    });
  }

  // Attach receiver and set binaryType
  useEffect(() => {
    if (dataChannel) {
      dataChannel.binaryType = 'arraybuffer';
      dataChannel.bufferedAmountLowThreshold = 4 * 1024 * 1024; // 4 MB
      dataChannel.onmessage = handleMessage;
      addLog('⚙️ Receiver attached (binaryType=arraybuffer)');
    }
  }, [dataChannel]);

  // Kick off queued sends
  useEffect(() => {
    if (dataChannel?.readyState !== 'open') return;
    for (const t of queue) {
      if (t.status === 'queued') {
        setQueue((q) => q.map((x) => (x.transferId === t.transferId ? { ...x, status: 'sending' } : x)));
        pq.current.add(() => pRetry(() => sendFile(t), { retries: 2 }))
          .catch((err) => addLog(`❌ Failed ${t.directoryPath}: ${err}`));
      }
    }
  }, [queue, dataChannel]);

  // Sender
  async function sendFile(t: Transfer) {
    const { file, transferId, directoryPath } = t;
    const total = file.size;
    let sent = 0;
    let lastTime = Date.now();
    const encoder = new TextEncoder();

    // sending meta data 
    addLog(`🚀 Start sending ${directoryPath}`);
    dataChannel!.send(
      JSON.stringify({ type: 'init', transferId, directoryPath, fileSize: total })
    );




    // sending file in smaller chunks 

    // read file in chunks 

    async function* readFileInChunks(file : File){
      const fileReader = file.stream().getReader();
      const chunkSize = 64 *   1024 ; // 64 Kb 
      let carry = new Uint8Array(0);

      while(true){
        const {done , value} = await fileReader.read();
        if(done) break;

        carry = concatUint8Array(carry , new Uint8Array(value));

        while(carry.length >= chunkSize){
          yield carry.slice(0 , chunkSize);
          carry = carry.slice(chunkSize);
        }
      }

      if (carry.length > 0) {
        yield carry;
      }
    }

    function concatUint8Array(a : Uint8Array , b : Uint8Array) {
      const c = new Uint8Array(a.length + b.length);
      c.set(a, 0);
      c.set(b, a.length);
      return c;
  }

    let chunkIndex = 0;
    for await (const chunk of readFileInChunks(file)) {

      chunkIndex++;
      // addLog(`🔸 Sending chunk #${chunkIndex}: ${chunk.byteLength} bytes`);

      const idBytes = encoder.encode(transferId);
      const header = new ArrayBuffer(4);
      new DataView(header).setUint32(0, idBytes.length);
      const packet = new Uint8Array(4 + idBytes.length + chunk.byteLength);
      packet.set(new Uint8Array(header), 0);
      packet.set(idBytes, 4);
      packet.set(chunk, 4 + idBytes.length);

      dataChannel!.send(packet.buffer);
      // addLog(`📤 packet sent, bufferedAmount=${dataChannel!.bufferedAmount}`);
      if (dataChannel!.bufferedAmount > 4 * 1024 * 1024) { // 4 mb . 
        await new Promise<void>(resolve => {
          addLog("Paused due to buffer overload.");
          dataChannel!.bufferedAmountLowThreshold = 4 * 1024 * 1024;
          dataChannel!.onbufferedamountlow = () => resolve();
        });
      }


      sent += chunk.byteLength;
      
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      if (dt >= 1) { // update every second.
        const speed = Math.round(sent / dt);
        setQueue(q => q.map(x => x.transferId === transferId
          ? { ...x, speedBps: speed }
          : x
        )
        );
        setMeta(m => ({ ...m, speedBps: speed }));
        lastTime = now;
      }
      const prog = Math.round((sent / total) * 100);
      setQueue(q => q.map(x => x.transferId === transferId
        ? { ...x, progress: prog }
        : x
      )
      );
    }

    setMeta(m => ({ ...m, totalSent: m.totalSent + total }));
    setQueue(q =>
      q.map(x =>
        x.transferId === transferId
          ? { ...x, progress: 100, status: 'done' }
          : x
      )
    );
    addLog(`✅ Finished sending ${directoryPath}`);
  }

  // Receiver
  async function handleMessage(event: MessageEvent) {
    addLog(`⬇️ Received ${event.data instanceof Blob ? 'blob' : event.data instanceof ArrayBuffer ? 'arraybuffer' : typeof event.data}`);

    let buf: ArrayBuffer | null = null;
    if (event.data instanceof Blob) {
      addLog('🟢 Blob received, converting to ArrayBuffer...');
      buf = await event.data.arrayBuffer();
    } else if (event.data instanceof ArrayBuffer) {
      buf = event.data;
    }

    if (buf) {
      const view = new DataView(buf);
      const idLen = view.getUint32(0);
      const transferId = new TextDecoder().decode(new Uint8Array(buf, 4, idLen));
      addLog(`🔸 transferId='${transferId}', idLen=${idLen}`);

      const rec = incoming.current[transferId];
      if (!rec) {
        addLog(`❓ Unknown transferId: ${transferId}`);
        return;
      }

      const chunk = new Uint8Array(buf, 4 + idLen);
      addLog(`🔹 Writing chunk length=${chunk.byteLength}`);
      rec.writer.write(chunk);
      rec.received += chunk.byteLength;
      setMeta(m => ({ ...m, totalReceived: m.totalReceived + chunk.byteLength }));
      const prog = Math.round((rec.received / rec.size) * 100);
      addLog(`📊 Progress ${rec.directoryPath}: ${prog}% (${rec.received}/${rec.size})`);

      if (rec.received >= rec.size) {
        rec.writer.close();
        delete incoming.current[transferId];
        addLog(`✅ Completed receiving ${rec.directoryPath}`);
      }
      return;
    }

    
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init') {
          const { transferId, directoryPath, fileSize } = msg;
          addLog(`📥 Init for ${directoryPath}, size=${fileSize}`);
          const stream = streamSaver.createWriteStream(directoryPath, { size: fileSize });
          incoming.current[transferId] = { size: fileSize, received: 0, directoryPath, writer: stream.getWriter() };
        }
      } catch (err) {
        console.error('Error parsing init JSON:', err);
        addLog(`❌ Error parsing init: ${err}`);
      }
    }
  }

  return { queue, meta, handleFileSelect, handleMessage };
}
