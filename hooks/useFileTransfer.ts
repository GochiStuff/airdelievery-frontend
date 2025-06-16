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

const CHUNK_SIZE = 256 * 1024;        // 256 KB optimal
const BUFFER_THRESHOLD = 8 * 1024 * 1024; // 8 MB
const PROGRESS_INTERVAL_MS = 500;      // 500 ms updates

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

  // Active incoming transfers
  const incoming = useRef<
    Record<
      string,
      { size: number; received: number; writer: WritableStreamDefaultWriter }
    >
  >({});

  // One send at a time
  const pq = useRef(new PQueue({ concurrency: 1 }));

  // Enqueue selected files/folders
  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = await flattenFileList(e.target.files);
    setQueue(prev => {
      const existingPaths = new Set(prev.map(t => t.directoryPath));
      const newTransfers = files
        .filter(f => !existingPaths.has((f as any).webkitRelativePath || f.name))
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

  // Setup receiver
  useEffect(() => {
    if (!dataChannel) return;
    dataChannel.binaryType = 'arraybuffer';
    dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
    dataChannel.onmessage = handleMessage;
    addLog('⚙️ Receiver initialized (binaryType=arraybuffer)');
  }, [dataChannel]);

  // Start sending queued files
  useEffect(() => {
    if (dataChannel?.readyState !== 'open') return;
    queue.forEach(t => {
      if (t.status !== 'queued') return;
      setQueue(q => q.map(x =>
        x.transferId === t.transferId ? { ...x, status: 'sending' } : x
      ));
      pq.current.add(() => pRetry(() => sendFile(t), { retries: 2 }))
        .catch(err => addLog(`❌ ${t.directoryPath} failed: ${err}`));
    });
  }, [queue, dataChannel]);

  // Read file as stream of Uint8Array chunks
  async function* readFileInChunks(file: File) {
    const reader = file.stream().getReader();
    let buffer = new Uint8Array(0);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = concat(buffer, new Uint8Array(value));
      while (buffer.length >= CHUNK_SIZE) {
        yield buffer.slice(0, CHUNK_SIZE);
        buffer = buffer.slice(CHUNK_SIZE);
      }
    }
    if (buffer.length) yield buffer;
  }

  // Helper to concat two Uint8Arrays
  function concat(a: Uint8Array, b: Uint8Array) {
    const c = new Uint8Array(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
  }

  // Send file via dataChannel
  async function sendFile({ file, transferId, directoryPath }: Transfer) {
    if (dataChannel!.readyState !== 'open')
      throw new Error(`Channel state ${dataChannel!.readyState}`);

    const total = file.size;
    let sent = 0;
    let lastTime = Date.now();
    let lastSent = 0;

    addLog(`🚀 Sending ${directoryPath}`);

    // Send init JSON
    dataChannel!.send(JSON.stringify({ type: 'init', transferId, directoryPath, size: total }));

    // Stream chunks
    for await (const chunk of readFileInChunks(file)) {
      // Wait if buffer too large
      if (dataChannel!.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>(res => {
          addLog('⏳ Waiting for buffer drain...');
          dataChannel!.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
          dataChannel!.onbufferedamountlow = () => res();
        });
      }

      // Check channel open
      if (dataChannel!.readyState !== 'open')
        throw new Error('DataChannel closed');

      dataChannel!.send(chunk.buffer);
      sent += chunk.length;

      const now = Date.now();
      const pct = (sent / total) * 100;
      if (
        now - lastTime > PROGRESS_INTERVAL_MS ||
        pct - (lastSent / total) * 100 >= 5
      ) {
        // Throttled updates
        setQueue(q => q.map(x =>
          x.transferId === transferId ? { ...x, progress: Math.round(pct) } : x
        ));
        const speed = Math.round(sent / ((now - lastTime) / 1000));
        setMeta(m => ({ ...m, speedBps: speed }));
        lastTime = now;
        lastSent = sent;
      }
    }

    // Finalize
    setQueue(q => q.map(x =>
      x.transferId === transferId ? { ...x, progress: 100, status: 'done' } : x
    ));
    setMeta(m => ({ ...m, totalSent: m.totalSent + total }));
    addLog(`✅ Completed ${directoryPath}`);
  }

  // Handle incoming data
  function handleMessage(event: MessageEvent) {
    if (typeof event.data === 'string') {
      const msg = JSON.parse(event.data);
      if (msg.type === 'init') {
        const { transferId, directoryPath, size } = msg;
        const stream = streamSaver.createWriteStream(directoryPath, { size });
        incoming.current[transferId] = { writer: stream.getWriter(), size, received: 0 };
        addLog(`📥 Init receive ${directoryPath}`);
      }
      return;
    }

    // Pure chunk path
    const buf = event.data as ArrayBuffer;
    const transferIds = Object.keys(incoming.current);
    if (!transferIds.length) return;
    const transferId = transferIds[0];
    const rec = incoming.current[transferId];

    rec.writer.write(new Uint8Array(buf));
    rec.received += buf.byteLength;
    setMeta(m => ({ ...m, totalReceived: m.totalReceived + buf.byteLength }));

    if (rec.received >= rec.size) {
      rec.writer.close();
      delete incoming.current[transferId];
      addLog(`✅ Received complete`);
    }
  }

  return { queue, meta, handleFileSelect, handleMessage };
}
