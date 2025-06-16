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

  const peerMax = (dataChannel as any)?.maxMessageSize || 256 * 1024;
  const CHUNK_SIZE = Math.min(512 * 1024, peerMax - 1024);
  const BUFFER_THRESHOLD = CHUNK_SIZE * 16;
  const PROGRESS_INTERVAL_MS = 500;

  const incoming = useRef<
    Record<
      string,
      { size: number; received: number; writer: WritableStreamDefaultWriter }
    >
  >({});

  const pq = useRef(new PQueue({ concurrency: 1 }));


  const statusMap: Record<Transfer["status"], string> = {
    queued: "Waiting to send",
    sending: "Transferring",
    done: "Completed",
    error: "Failed",
  };

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
          status: "queued" as const,
        }));
      return [...prev, ...newTransfers];
    });
  }

  useEffect(() => {
    if (!dataChannel) return;
    dataChannel.binaryType = "arraybuffer";
    dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
    dataChannel.onmessage = handleMessage;
    addLog("⚙️ Receiver initialized (binaryType=arraybuffer)");
  }, [dataChannel]);

  useEffect(() => {
    if (dataChannel?.readyState !== "open") return;
    queue.forEach(t => {
      if (t.status !== "queued") return;
      setQueue(q =>
        q.map(x =>
          x.transferId === t.transferId ? { ...x, status: "sending" } : x
        )
      );
      pq.current
        .add(() => pRetry(() => sendFile(t), { retries: 2 }))
        .catch(err =>
          setQueue(q =>
            q.map(x =>
              x.transferId === t.transferId
                ? { ...x, status: "error" }
                : x
            )
          )
        );
    });
  }, [queue, dataChannel]);

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

  function concat(a: Uint8Array, b: Uint8Array) {
    const c = new Uint8Array(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
  }

  async function sendFile({ file, transferId, directoryPath }: Transfer) {
    if (dataChannel!.readyState !== "open")
      throw new Error(`Connection is not open`);

    const total = file.size;
    let sent = 0;
    let lastTime = Date.now();
    let lastSent = 0;

    addLog(`🚀 Sending ${directoryPath}`);

    dataChannel!.send(
      JSON.stringify({ type: "init", transferId, directoryPath, size: total })
    );

    for await (const chunk of readFileInChunks(file)) {
      if (dataChannel!.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>(res => {
          addLog("⏳ Waiting for network...");
          dataChannel!.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
          dataChannel!.onbufferedamountlow = () => res();
        });
      }
      if (dataChannel!.readyState !== "open")
        throw new Error("Connection closed");

      dataChannel!.send(chunk.buffer);
      sent += chunk.length;

      const now = Date.now();
      const pct = (sent / total) * 100;
      if (
        now - lastTime > PROGRESS_INTERVAL_MS ||
        pct - (lastSent / total) * 100 >= 5
      ) {
        setQueue(q =>
          q.map(x =>
            x.transferId === transferId
              ? { ...x, progress: Math.round(pct) }
              : x
          )
        );
        const bytesSinceLast = sent - lastSent;
        const timeElapsedSec = (now - lastTime) / 1000;
        const speed = timeElapsedSec > 0 ? Math.round(bytesSinceLast / timeElapsedSec) : 0;
        setMeta(m => ({ ...m, speedBps: speed }));
        lastTime = now;
        lastSent = sent;
      }
    }

    setQueue(q =>
      q.map(x =>
        x.transferId === transferId
          ? { ...x, progress: 100, status: "done" }
          : x
      )
    );
    setMeta(m => ({ ...m, totalSent: m.totalSent + total }));
    addLog(`✅ Completed ${directoryPath}`);
  }
const writeBufferSize = 512 * 1024; 
let writeBuffer: Uint8Array[] = [];

let writeBufferLength = 0;
let flushTimeout: NodeJS.Timeout | null = null;

function flushBuffer(writer: WritableStreamDefaultWriter) {
  const all = new Uint8Array(writeBufferLength);
  let offset = 0;
  for (const chunk of writeBuffer) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  writer.write(all);
  writeBuffer = [];
  writeBufferLength = 0;
  flushTimeout = null;
}

function handleMessage(event: MessageEvent) {
  if (typeof event.data === "string") {
    const msg = JSON.parse(event.data);
    if (msg.type === "init") {
      const { transferId, directoryPath, size } = msg;
      const stream = streamSaver.createWriteStream(directoryPath, { size });
      incoming.current[transferId] = {
        writer: stream.getWriter(),
        size,
        received: 0,
      };
      addLog(`📥 Preparing to receive ${directoryPath}`);
    }
    return;
  }

  const buf = new Uint8Array(event.data);
  const transferIds = Object.keys(incoming.current);
  if (!transferIds.length) return;
  const transferId = transferIds[0];
  const rec = incoming.current[transferId];

  writeBuffer.push(buf);
  writeBufferLength += buf.length;

  rec.received += buf.length;
  setMeta(m => ({ ...m, totalReceived: m.totalReceived + buf.length }));

  // Batch write
  if (writeBufferLength >= writeBufferSize) {
    flushBuffer(rec.writer);
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => flushBuffer(rec.writer), 20); // flush soon
  }

  if (rec.received >= rec.size) {
    if (writeBufferLength > 0) {
      flushBuffer(rec.writer);
    }
    rec.writer.close();
    delete incoming.current[transferId];
    addLog(`✅ File received`);
  }
}


  const userQueue = queue.map(t => ({
    ...t,
    userStatus: statusMap[t.status],
  }));

  return { queue: userQueue, meta, handleFileSelect, handleMessage };
}
