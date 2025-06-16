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


type InMemRec = {
  buffers: Uint8Array[];
  received: number;
  expected: number;
  path: string;
};


type StreamRec = {
  writer: WritableStreamDefaultWriter;
  bufferQueue: Uint8Array[];
  bufferedBytes: number;
  received: number;
  expected: number;
};

const inMemStore   = new Map<string, InMemRec>();
const streamStore  = new Map<string, StreamRec>();

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

  const peerMax         = (dataChannel as any)?.maxMessageSize || 256*1024; 
  const CHUNK_SIZE      = Math.min(512*1024, peerMax - 1024);
  const BUFFER_THRESHOLD = CHUNK_SIZE * 16;       // ~8 MB
  const PROGRESS_INTERVAL_MS = 500;             // 500ms

  const MAX_IN_MEMORY      = 0.5 * 1024 * 1024 * 1024; // 0.5 GB RAM cap
  const STREAM_BATCH_SIZE  = 2 * 1024 * 1024;   // 4 MB per disk write batch
  const STREAM_BUFFER      = 128 * 1024 * 1024;  //128 MB highWaterMark


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

  let isPaused = false;


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
        if (!isPaused) {
          isPaused = true;
          addLog("⏳ Paused sending—waiting for buffer to drain…");
        }
        
        await new Promise<void>(res => {
          dataChannel!.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
          dataChannel!.onbufferedamountlow = () => res();
        });

            isPaused = false;
        addLog("▶️ Buffer drained—resuming send");
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
  // 1) INIT
  if (typeof event.data === 'string') {
    const msg = JSON.parse(event.data);
    if (msg.type === 'init') {
      const { transferId, directoryPath, size } = msg;
      
      if (size <= MAX_IN_MEMORY) {
        // small file: buffer in RAM
        inMemStore.set(transferId, {
          buffers: [], received: 0, expected: size, path: directoryPath
        });
        addLog(`📥 Init in‑RAM receive ${directoryPath} (${size} B)`);
      } else {
        // large file: streamed writes
        const stream = streamSaver.createWriteStream(directoryPath, {
          size,
          writableStrategy: { highWaterMark: STREAM_BUFFER }
        });
        const writer = stream.getWriter();
        streamStore.set(transferId, {
          writer,
          bufferQueue: [],
          bufferedBytes: 0,
          received: 0,
          expected: size
        });
        addLog(`📥 Init streaming receive ${directoryPath} (${size} B)`);
      }
    }
    return;
  }

  // 2) CHUNK
  const buf = new Uint8Array(event.data as ArrayBuffer);

  // Prefer in‑RAM, else streaming
  const tid = [...inMemStore.keys(), ...streamStore.keys()][0];
  if (!tid) return;  // no active transfer

  // — In‑RAM path —
  if (inMemStore.has(tid)) {
    const rec = inMemStore.get(tid)!;
    rec.buffers.push(buf);
    rec.received += buf.byteLength;
    setMeta(m => ({ ...m, totalReceived: m.totalReceived + buf.byteLength }));
    addLog(`🔹 Buffered ${rec.received}/${rec.expected} B in RAM`);

    if (rec.received >= rec.expected) {
      // flush entire buffer
      const full = new Uint8Array(rec.expected);
      let off = 0;
      for (const part of rec.buffers) {
        full.set(part, off);
        off += part.byteLength;
      }
      const ws = streamSaver.createWriteStream(rec.path, { size: rec.expected });
      const w = ws.getWriter();
      w.write(full);
      w.close();
      inMemStore.delete(tid);
      addLog(`✅ Flushed from RAM to disk: ${rec.path}`);
    }
    return;
  }

  // — Streaming path —
  if (streamStore.has(tid)) {
    const rec = streamStore.get(tid)!;
    rec.bufferQueue.push(buf);
    rec.bufferedBytes += buf.byteLength;
    rec.received    += buf.byteLength;
    setMeta(m => ({ ...m, totalReceived: m.totalReceived + buf.byteLength }));

    // batch-write when enough queued
    if (rec.bufferedBytes >= STREAM_BATCH_SIZE) {
      const toWrite = new Uint8Array(rec.bufferedBytes);
      let off = 0;
      for (const part of rec.bufferQueue) {
        toWrite.set(part, off);
        off += part.byteLength;
      }
      rec.writer.write(toWrite);
      rec.bufferQueue  = [];
      rec.bufferedBytes = 0;
      addLog(`✏️ Wrote 512 KB batch to disk`);
    }

    // on complete, flush remainder & close
    if (rec.received >= rec.expected) {
      if (rec.bufferedBytes > 0) {
        const rem = new Uint8Array(rec.bufferedBytes);
        let o = 0;
        for (const p of rec.bufferQueue) {
          rem.set(p, o);
          o += p.byteLength;
        }
        rec.writer.write(rem);
      }
      rec.writer.close();
      streamStore.delete(tid);
      addLog(`✅ Streaming receive complete`);
    }
    return;
  }
}


  return { queue, meta, handleFileSelect, handleMessage };
}
